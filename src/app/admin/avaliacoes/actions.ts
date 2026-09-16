"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { setReviewHidden, deleteReview } from "@/server/repositories/review-repository";
import { withMutationFallback } from "@/lib/db-fallback";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

export type ReviewMutationResult = { success: true } | { success: false; error: string };

export async function setReviewHiddenAction(id: string, hidden: boolean): Promise<ReviewMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const result = await withMutationFallback(async () => {
    await setReviewHidden(id, hidden);
    return { success: true } as ReviewMutationResult;
  });
  if (result.success) revalidatePath("/admin/avaliacoes");
  return result;
}

export async function deleteReviewAction(id: string): Promise<ReviewMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const result = await withMutationFallback(async () => {
    await deleteReview(id);
    return { success: true } as ReviewMutationResult;
  });
  if (result.success) revalidatePath("/admin/avaliacoes");
  return result;
}
