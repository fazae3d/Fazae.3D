"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import {
  deleteOrder,
  findOrderById,
  markOrdersPaid,
  setManualOrderPayment,
  updateOrderDetails,
  updateOrderStatus,
  type DeleteOrderResult,
  type OrderStatusUpdateResult,
} from "@/server/repositories/order-repository";
import type { OrderItem, OrderStatus } from "@/server/types";
import { z } from "zod";
import { round2 } from "@/lib/money";
import { slugify } from "@/lib/slug";
import { getProduct } from "@/server/repositories/product-repository";
import { withMutationFallback } from "@/lib/db-fallback";
import { notifyOrderStatusChange } from "@/lib/order-notifications";
import { logAdminAction } from "@/server/audit";

const VALID_STATUSES: OrderStatus[] = [
  "Pedido recebido",
  "Pagamento aprovado",
  "Em preparação",
  "Enviado",
  "Em trânsito",
  "Entregue",
  "Cancelado",
];

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function updateOrderStatusAction(
  id: string,
  status: OrderStatus,
  tracking: string,
): Promise<OrderStatusUpdateResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  if (!VALID_STATUSES.includes(status) || tracking.length > 80) {
    return { success: false, error: "Status ou código de rastreio inválido." };
  }
  const result = await withMutationFallback(() => updateOrderStatus(id, status, tracking.trim()));
  if (result.success) {
    revalidatePath("/admin/pedidos");
    revalidatePath("/conta/pedidos");
    revalidatePath("/rastreamento");
    await notifyOrderStatusChange(result.order, result.previousStatus);
    if (result.previousStatus !== status) {
      await logAdminAction("pedido.status", "Order", id, { de: result.previousStatus, para: status, rastreio: tracking || undefined });
    }
  }
  return result;
}

const editLineSchema = z.object({
  productSlug: z.string().max(120).optional(),
  name: z.string().trim().min(1, "Dê um nome a todos os itens.").max(120),
  material: z.string().max(60).optional(),
  color: z.string().max(60).optional(),
  scale: z.string().max(30).optional(),
  quantity: z.number().int("A quantidade precisa ser um número inteiro.").min(1, "A quantidade mínima é 1.").max(999),
  price: z.number().min(0, "O preço não pode ser negativo.").max(100000),
});
const editOrderSchema = z.object({
  items: z.array(editLineSchema).min(1, "O pedido precisa ter pelo menos um item.").max(60),
  shipping: z.number().min(0).max(100000),
  discount: z.number().min(0).max(1000000),
});

export type EditOrderInput = z.input<typeof editOrderSchema>;
export type EditOrderResult = { success: true; total: number; balanceDue: number; overpaid: number } | { success: false; error: string };

/** Edita itens, preços, frete e desconto de um pedido lançado. Itens do catálogo seguem o nome e a categoria do cadastro; o preço é o que for digitado. */
export async function updateOrderDetailsAction(orderId: string, input: EditOrderInput): Promise<EditOrderResult> {
  if (!(await requireAdmin())) return { success: false, error: "Acesso restrito ao administrador." };
  const parsed = editOrderSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { shipping, discount } = parsed.data;
  const lines = parsed.data.items.map((l) => ({ ...l, price: round2(l.price) }));
  const subtotal = round2(lines.reduce((sum, l) => sum + l.price * l.quantity, 0));
  if (discount > subtotal + shipping) return { success: false, error: "O desconto não pode passar do valor dos itens somado ao frete." };

  const result = await withMutationFallback(async () => {
    const items: OrderItem[] = [];
    for (const line of lines) {
      const product = line.productSlug && !line.productSlug.startsWith("avulso-") ? await getProduct(line.productSlug) : undefined;
      if (line.productSlug && !line.productSlug.startsWith("avulso-") && !product) {
        return { success: false as const, error: `O produto "${line.name}" não existe mais no catálogo.` };
      }
      items.push({
        productSlug: product ? product.slug : line.productSlug?.startsWith("avulso-") ? line.productSlug : `avulso-${slugify(line.name).slice(0, 60) || "item"}`,
        name: product ? product.name : line.name,
        categoryName: product ? product.categoryName : "Avulso",
        material: line.material ?? "",
        color: line.color ?? "",
        quantity: line.quantity,
        price: line.price,
        ...(line.scale ? { scale: line.scale } : {}),
      });
    }
    const updated = await updateOrderDetails(orderId, { items, shipping: round2(shipping), discount: round2(discount) });
    if (!updated.success) return updated;
    await logAdminAction("pedido.editar", "Order", orderId, {
      totalAntes: updated.previousTotal,
      totalDepois: updated.order.total,
      itens: items.map((i) => `${i.quantity}x ${i.name} (${i.price})`),
      frete: shipping,
      desconto: discount,
    });
    return { success: true as const, total: updated.order.total, balanceDue: updated.balanceDue, overpaid: updated.overpaid };
  });
  if (result.success) {
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/producao");
    revalidatePath("/admin/financas");
    revalidatePath("/admin");
  }
  return result;
}

export async function deleteOrderAction(id: string): Promise<DeleteOrderResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const before = await findOrderById(id).catch(() => undefined);
  const result = await withMutationFallback(() => deleteOrder(id));
  if (result.success) {
    await logAdminAction("pedido.excluir", "Order", id, {
      total: before?.total,
      status: before?.status,
      cliente: before?.customerName ?? before?.userEmail,
    });
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/financas");
    revalidatePath("/admin/producao");
  }
  return result;
}

/** Marca como pagas vendas lançadas no painel (até 200 de uma vez). Pedidos do site e cancelados são ignorados. */
export async function markOrdersPaidAction(ids: string[]): Promise<{ success: true; updated: number } | { success: false; error: string }> {
  if (!(await requireAdmin())) return { success: false, error: "Acesso restrito ao administrador." };
  const clean = [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0 && id.length < 80))].slice(0, 200);
  if (clean.length === 0) return { success: false, error: "Nenhum pedido selecionado." };
  const result = await withMutationFallback(async () => ({ success: true as const, ...(await markOrdersPaid(clean)) }));
  if (result.success) {
    await logAdminAction("pedido.pago", "Order", clean.length === 1 ? clean[0] : "varios", { pedidos: clean.length, atualizados: result.updated });
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin");
    revalidatePath("/admin/financas");
    revalidatePath("/admin/producao");
  }
  return result;
}

/** Registra um pagamento (pode ser parcial) ou corrige/desfaz o valor recebido de uma venda lançada no painel. */
export async function setOrderPaymentAction(
  id: string,
  mode: "add" | "set",
  amount: number,
): Promise<{ success: true; received: number; paid: boolean; total: number } | { success: false; error: string }> {
  if (!(await requireAdmin())) return { success: false, error: "Acesso restrito ao administrador." };
  if (!Number.isFinite(amount) || amount < 0 || amount > 1_000_000) return { success: false, error: "Informe um valor válido." };
  if (mode === "add" && amount <= 0) return { success: false, error: "Informe quanto você recebeu." };
  const result = await withMutationFallback(() => setManualOrderPayment(id, mode, amount));
  if (result.success) {
    await logAdminAction("pedido.pagamento", "Order", id, { modo: mode, valor: amount, recebido: result.received, pago: result.paid });
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin");
    revalidatePath("/admin/financas");
    revalidatePath("/admin/producao");
  }
  return result;
}
