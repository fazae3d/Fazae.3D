"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { rawMaterialFormSchema, type RawMaterialFormInput } from "@/lib/admin-validation";
import {
  createRawMaterial,
  deleteRawMaterial,
  updateRawMaterial,
  type DeleteRawMaterialResult,
  type RawMaterialInput,
} from "@/server/repositories/raw-material-repository";
import type { RawMaterial } from "@/server/types";
import { withMutationFallback } from "@/lib/db-fallback";

type RawMaterialMutationResult = { success: true; rawMaterial: RawMaterial } | { success: false; error: string };

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

function toRawMaterialInput(input: RawMaterialFormInput): RawMaterialInput {
  return {
    name: input.name,
    unit: input.unit,
    stock: input.stock,
    costPerUnit: input.costPerUnit,
    minStock: input.minStock === "" || input.minStock === undefined ? undefined : Number(input.minStock),
  };
}

function revalidateRawMaterialPaths() {
  revalidatePath("/admin/insumos");
  revalidatePath("/admin");
}

export async function createRawMaterialAction(input: RawMaterialFormInput): Promise<RawMaterialMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = rawMaterialFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    const rawMaterial = await createRawMaterial(toRawMaterialInput(parsed.data));
    revalidateRawMaterialPaths();
    return { success: true, rawMaterial };
  });
}

export async function updateRawMaterialAction(
  id: string,
  input: RawMaterialFormInput,
): Promise<RawMaterialMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = rawMaterialFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  return withMutationFallback(async () => {
    const rawMaterial = await updateRawMaterial(id, toRawMaterialInput(parsed.data));
    if (!rawMaterial) {
      return { success: false, error: "Insumo não encontrado." };
    }
    revalidateRawMaterialPaths();
    return { success: true, rawMaterial };
  });
}

export async function deleteRawMaterialAction(id: string): Promise<DeleteRawMaterialResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() => deleteRawMaterial(id));
  if (result.success) revalidateRawMaterialPaths();
  return result;
}
