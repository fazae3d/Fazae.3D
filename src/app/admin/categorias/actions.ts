"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { categoryFormSchema, type CategoryFormInput } from "@/lib/admin-validation";
import {
  createCategory,
  deleteCategory,
  getCategory,
  updateCategory,
  type DeleteCategoryResult,
} from "@/server/repositories/category-repository";
import type { Category } from "@/lib/types";
import { withMutationFallback } from "@/lib/db-fallback";

type CategoryMutationResult = { success: true; category: Category } | { success: false; error: string };

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

function revalidateCategoryPaths(slug: string) {
  revalidatePath("/");
  revalidatePath("/loja");
  revalidatePath(`/categorias/${slug}`);
}

export async function createCategoryAction(input: CategoryFormInput): Promise<CategoryMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    if (await getCategory(parsed.data.slug)) {
      return { success: false, error: "Já existe uma categoria com esse slug." };
    }
    const category = await createCategory(parsed.data);
    revalidateCategoryPaths(category.slug);
    return { success: true, category };
  });
}

export async function updateCategoryAction(slug: string, input: CategoryFormInput): Promise<CategoryMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    const category = await updateCategory(slug, {
      name: parsed.data.name,
      description: parsed.data.description,
      icon: parsed.data.icon,
    });
    if (!category) {
      return { success: false, error: "Categoria não encontrada." };
    }
    revalidateCategoryPaths(slug);
    return { success: true, category };
  });
}

export async function deleteCategoryAction(slug: string): Promise<DeleteCategoryResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() => deleteCategory(slug));
  if (result.success) revalidateCategoryPaths(slug);
  return result;
}
