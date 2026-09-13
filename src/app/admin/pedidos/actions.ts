"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import {
  deleteOrder,
  updateOrderStatus,
  type DeleteOrderResult,
  type UpdateOrderResult,
} from "@/server/repositories/order-repository";
import type { OrderStatus } from "@/server/types";
import { withMutationFallback } from "@/lib/db-fallback";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function updateOrderStatusAction(
  id: string,
  status: OrderStatus,
  tracking: string,
): Promise<UpdateOrderResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() => updateOrderStatus(id, status, tracking));
  if (result.success) {
    revalidatePath("/admin/pedidos");
    revalidatePath("/conta/pedidos");
    revalidatePath("/rastreamento");
  }
  return result;
}

export async function deleteOrderAction(id: string): Promise<DeleteOrderResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const result = await withMutationFallback(() => deleteOrder(id));
  if (result.success) {
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/financas");
    revalidatePath("/admin/producao");
  }
  return result;
}
