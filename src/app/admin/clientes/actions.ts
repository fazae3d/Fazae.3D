"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { customerCreateSchema, customerCrmSchema, type CustomerCreateInput, type CustomerCrmInput } from "@/lib/admin-validation";
import { logAdminAction } from "@/server/audit";
import { normalizePhone } from "@/lib/whatsapp";
import {
  identifyOrdersCustomer,
  markCustomerReminded,
  updateCustomerCrmInfo,
  upsertCustomerFromContact,
} from "@/server/repositories/customer-repository";
import type { Customer } from "@/server/types";
import { withMutationFallback } from "@/lib/db-fallback";

type CustomerMutationResult = { success: true; customer: Customer } | { success: false; error: string };

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

function parseTags(tagsRaw?: string): string[] {
  return (tagsRaw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function revalidateCustomerPaths(id?: string) {
  revalidatePath("/admin/clientes");
  if (id) revalidatePath(`/admin/clientes/${id}`);
}

export async function updateCustomerNotesAction(
  id: string,
  input: CustomerCrmInput,
): Promise<CustomerMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = customerCrmSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco, hoje a escrita real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    const customer = await updateCustomerCrmInfo(id, {
      notes: parsed.data.notes,
      tags: parseTags(parsed.data.tagsRaw),
    });
    if (!customer) {
      return { success: false, error: "Cliente não encontrado." };
    }
    revalidateCustomerPaths(id);
    return { success: true, customer };
  });
}

export async function createCustomerAction(input: CustomerCreateInput): Promise<CustomerMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = customerCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco, hoje a escrita real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    const created = await upsertCustomerFromContact({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || undefined,
    });
    const customer = await updateCustomerCrmInfo(created.id, {
      notes: parsed.data.notes,
      tags: parseTags(parsed.data.tagsRaw),
    });
    revalidateCustomerPaths(created.id);
    return { success: true, customer: customer ?? created };
  });
}

/** Identifica o cliente de pedidos que ficaram sem telefone: grava o telefone nos pedidos e cadastra (ou completa) o cliente. */
export async function identifyOrdersAction(input: {
  orderIds: string[];
  name: string;
  phone: string;
  source?: string;
}): Promise<{ success: true; updated: number } | { success: false; error: string }> {
  if (!(await requireAdmin())) return { success: false, error: "Acesso restrito ao administrador." };
  const name = input.name.trim();
  if (!name) return { success: false, error: "Informe o nome do cliente." };
  if (!normalizePhone(input.phone)) return { success: false, error: "Telefone inválido. Use o DDD e o número, por exemplo 84 99999-8888." };
  if (input.orderIds.length === 0 || input.orderIds.length > 200) return { success: false, error: "Nenhum pedido selecionado." };
  return withMutationFallback(async () => {
    const { updated, customer } = await identifyOrdersCustomer({ orderIds: input.orderIds, name, phone: input.phone, source: input.source });
    await logAdminAction("pedido.identificar", "Customer", customer.id, { cliente: customer.name, pedidos: updated });
    revalidatePath("/admin/clientes", "layout");
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin");
    return { success: true, updated } as const;
  });
}

/** Registra que o cliente foi chamado para voltar a comprar: ele sai da lista "Para reativar" por 30 dias. */
export async function markCustomerRemindedAction(id: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return { success: false, error: "Acesso restrito ao administrador." };
  return withMutationFallback(async () => {
    await markCustomerReminded(id);
    await logAdminAction("cliente.lembrete", "Customer", id);
    revalidatePath("/admin/clientes/reativar");
    revalidatePath("/admin");
    return { success: true } as const;
  });
}
