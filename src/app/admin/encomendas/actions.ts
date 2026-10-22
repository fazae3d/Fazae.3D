"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { z } from "zod";
import { customOrderRequestUpdateSchema } from "@/lib/admin-validation";
import { round2 } from "@/lib/money";
import { logAdminAction } from "@/server/audit";
import { addOrder, generateOrderId } from "@/server/repositories/order-repository";
import { createCustomOrderRequest, updateCustomOrderRequest } from "@/server/repositories/custom-order-request-repository";
import type { Order } from "@/server/types";
import type { CustomOrderRequest, CustomRequestStatus } from "@/lib/types";
import { withMutationFallback } from "@/lib/db-fallback";

type UpdateResult = { success: true; request: CustomOrderRequest } | { success: false; error: string };

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function updateCustomOrderRequestAction(
  id: string,
  status: CustomRequestStatus,
  adminNotes: string,
): Promise<UpdateResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = customOrderRequestUpdateSchema.safeParse({ status, adminNotes });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco, hoje a escrita real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    const updated = await updateCustomOrderRequest(id, {
      status: parsed.data.status,
      adminNotes: parsed.data.adminNotes,
    });
    if (!updated) {
      return { success: false, error: "Solicitação não encontrada." };
    }
    revalidatePath("/admin/encomendas");
    return { success: true, request: updated };
  });
}

const manualEncomendaSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome do cliente."),
  phone: z.string().refine((v) => v.replace(/\D/g, "").length >= 10, "Informe um WhatsApp válido (com DDD)."),
  email: z.union([z.string().email("E-mail inválido."), z.literal("")]).optional(),
  description: z.string().trim().min(3, "Descreva o que será produzido."),
  quantity: z.number("Informe uma quantidade válida.").int("Informe uma quantidade válida.").min(1, "Quantidade mínima é 1."),
  unitPrice: z.number("Informe um valor válido.").min(0, "O valor não pode ser negativo."),
  deposit: z.number("Informe um sinal válido.").min(0, "O sinal não pode ser negativo."),
  deadline: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, "Prazo inválido.").optional(),
  paymentMethod: z.enum(["pix", "cartao", "boleto"]),
});

export type ManualEncomendaInput = z.infer<typeof manualEncomendaSchema>;
type ManualEncomendaResult = { success: true; orderId: string } | { success: false; error: string };

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Encomenda cadastrada à mão (cliente que fechou pelo WhatsApp): grava o registro em Encomendas já como "Fechado"
 * e lança a venda (canal WhatsApp) na fila de produção, com prazo e sinal. O estoque não é mexido.
 */
export async function createManualEncomendaAction(input: ManualEncomendaInput): Promise<ManualEncomendaResult> {
  if (!(await requireAdmin())) return { success: false, error: "Acesso restrito ao administrador." };
  const parsed = manualEncomendaSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const data = parsed.data;
  const total = round2(data.quantity * data.unitPrice);
  if (data.deposit > total) return { success: false, error: "O sinal não pode ser maior que o total da venda." };

  return withMutationFallback(async (): Promise<ManualEncomendaResult> => {
    const phone = data.phone.replace(/\D/g, "");
    const request = await createCustomOrderRequest({
      name: data.name,
      phone,
      email: data.email || undefined,
      description: data.description,
      quantity: data.quantity,
      desiredDeadline: data.deadline || undefined,
    });
    const order: Order = {
      id: generateOrderId(),
      createdAt: new Date().toISOString(),
      channel: "whatsapp",
      originRequestId: request.id,
      customerName: data.name,
      customerPhone: phone,
      userEmail: data.email || undefined,
      items: [
        {
          productSlug: `avulso-${slugify(data.description).slice(0, 60) || "item"}`,
          name: data.description,
          categoryName: "Avulso",
          material: "",
          color: "",
          quantity: data.quantity,
          price: data.unitPrice,
        },
      ],
      subtotal: total,
      shipping: 0,
      discount: 0,
      total,
      paymentMethod: data.paymentMethod,
      status: "Pedido recebido",
      productionDeadline: data.deadline ? new Date(`${data.deadline}T12:00:00-03:00`).toISOString() : undefined,
      depositAmount: data.deposit,
    };
    const created = await addOrder(order, { forceProductionPending: true });
    await updateCustomOrderRequest(request.id, { status: "fechado", linkedOrderId: created.id });
    await logAdminAction("encomenda.manual", "Order", created.id, { total, requestId: request.id });
    revalidatePath("/admin/encomendas");
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/producao");
    revalidatePath("/admin/financas");
    revalidatePath("/admin");
    return { success: true, orderId: created.id };
  });
}
