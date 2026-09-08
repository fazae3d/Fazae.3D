"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { customOrderRequestUpdateSchema } from "@/lib/admin-validation";
import { updateCustomOrderRequest } from "@/server/repositories/custom-order-request-repository";
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

  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
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
