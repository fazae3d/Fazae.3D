"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { updateProduct, type ProductMutationResult } from "@/server/repositories/product-repository";
import { withMutationFallback } from "@/lib/db-fallback";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

export async function updateStockAction(slug: string, stock: number): Promise<ProductMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  if (!Number.isInteger(stock) || stock < 0) {
    return { success: false, error: "Informe um número inteiro maior ou igual a zero." };
  }

  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() => updateProduct(slug, { stock }));
  if (result.success) {
    revalidatePath("/admin/estoque");
    revalidatePath("/admin/produtos");
    revalidatePath("/admin");
    revalidatePath(`/produto/${result.product.slug}`);
  }
  return result;
}
