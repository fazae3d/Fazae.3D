"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import {
  deleteOrder,
  findOrderById,
  markOrdersPaid,
  updateOrderStatus,
  type DeleteOrderResult,
  type OrderStatusUpdateResult,
} from "@/server/repositories/order-repository";
import type { OrderStatus } from "@/server/types";
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
