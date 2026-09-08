"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { updateOrderProduction, type UpdateOrderResult } from "@/server/repositories/order-repository";
import type { ProductionStage } from "@/generated/prisma/client";
import { withMutationFallback } from "@/lib/db-fallback";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function updateProductionAction(
  orderId: string,
  data: { stage?: ProductionStage; deadline?: string | null; depositAmount?: number },
): Promise<UpdateOrderResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() =>
    updateOrderProduction(orderId, {
      stage: data.stage,
      deadline: data.deadline === undefined ? undefined : data.deadline ? new Date(data.deadline) : null,
      depositAmount: data.depositAmount,
    }),
  );
  if (result.success) {
    revalidatePath("/admin/producao");
    revalidatePath("/admin/pedidos");
  }
  return result;
}
