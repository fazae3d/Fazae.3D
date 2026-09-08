"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { materialFormSchema, type MaterialFormInput } from "@/lib/admin-validation";
import {
  createMaterial,
  deleteMaterial,
  getMaterial,
  updateMaterial,
} from "@/server/repositories/material-repository";
import type { Material } from "@/lib/types";
import { withMutationFallback } from "@/lib/db-fallback";

type MaterialMutationResult = { success: true; material: Material } | { success: false; error: string };
type DeleteMaterialResult = { success: true } | { success: false; error: string };

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

function revalidateMaterialPaths() {
  revalidatePath("/admin/materiais");
  revalidatePath("/admin/produtos");
}

export async function createMaterialAction(input: MaterialFormInput): Promise<MaterialMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = materialFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    if (await getMaterial(parsed.data.slug)) {
      return { success: false, error: "Já existe um material com esse slug." };
    }
    const material = await createMaterial(parsed.data);
    revalidateMaterialPaths();
    return { success: true, material };
  });
}

export async function updateMaterialAction(slug: string, input: MaterialFormInput): Promise<MaterialMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = materialFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    const material = await updateMaterial(slug, { name: parsed.data.name, colors: parsed.data.colors });
    if (!material) {
      return { success: false, error: "Material não encontrado." };
    }
    revalidateMaterialPaths();
    return { success: true, material };
  });
}

export async function deleteMaterialAction(slug: string): Promise<DeleteMaterialResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(async () => {
    await deleteMaterial(slug);
    return { success: true } as DeleteMaterialResult;
  });
  if (result.success) revalidateMaterialPaths();
  return result;
}
