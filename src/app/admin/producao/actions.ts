"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { updateOrderProduction, type UpdateOrderResult } from "@/server/repositories/order-repository";
import {
  createProductionItem,
  deleteProductionItem,
  updateProductionItem,
} from "@/server/repositories/production-item-repository";
import type { ProductionStage } from "@/generated/prisma/client";
import type { ProductionItem } from "@/server/types";
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

type ProductionItemResult = { success: true; item: ProductionItem } | { success: false; error: string };
type SimpleResult = { success: true } | { success: false; error: string };

export async function createProductionItemAction(input: {
  productSlug?: string;
  description: string;
  quantity: number;
  deadline?: string;
  notes?: string;
}): Promise<ProductionItemResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const description = input.description.trim();
  if (!description) {
    return { success: false, error: "Informe uma descrição para o item." };
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    return { success: false, error: "Informe uma quantidade válida." };
  }
  return withMutationFallback(async () => {
    const item = await createProductionItem({
      productSlug: input.productSlug || undefined,
      description,
      quantity: input.quantity,
      deadline: input.deadline ? new Date(input.deadline) : undefined,
      notes: input.notes || undefined,
    });
    revalidatePath("/admin/producao");
    return { success: true, item };
  });
}

export async function updateProductionItemAction(
  id: string,
  data: { stage?: ProductionStage; deadline?: string | null; quantity?: number; notes?: string },
): Promise<ProductionItemResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  return withMutationFallback(async () => {
    const item = await updateProductionItem(id, {
      stage: data.stage,
      deadline: data.deadline === undefined ? undefined : data.deadline ? new Date(data.deadline) : null,
      quantity: data.quantity,
      notes: data.notes,
    });
    if (!item) {
      return { success: false, error: "Item não encontrado." };
    }
    revalidatePath("/admin/producao");
    return { success: true, item };
  });
}

export async function deleteProductionItemAction(id: string): Promise<SimpleResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  return withMutationFallback(async () => {
    await deleteProductionItem(id);
    revalidatePath("/admin/producao");
    return { success: true };
  });
}
