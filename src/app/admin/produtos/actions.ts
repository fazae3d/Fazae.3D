"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { productFormSchema, type ProductFormInput } from "@/lib/admin-validation";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type DeleteProductResult,
  type ProductInput,
  type ProductMutationResult,
} from "@/server/repositories/product-repository";
import { setUsagesForProduct } from "@/server/repositories/product-material-usage-repository";
import { withMutationFallback } from "@/lib/db-fallback";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

function toStoredProduct(input: ProductFormInput): ProductInput {
  const tags = (input.tagsRaw ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    slug: input.slug,
    name: input.name,
    categorySlug: input.categorySlug,
    type: input.type,
    price: input.price === "" || input.price === undefined ? undefined : Number(input.price),
    compareAtPrice:
      input.compareAtPrice === "" || input.compareAtPrice === undefined ? undefined : Number(input.compareAtPrice),
    stock: input.stock,
    materials: input.materials,
    scaleOptions: input.scaleOptions ?? [],
    weightGrams: input.weightGrams === "" || input.weightGrams === undefined ? undefined : Number(input.weightGrams),
    dimensions: input.dimensions,
    estimatedProductionDays:
      input.estimatedProductionDays === "" || input.estimatedProductionDays === undefined
        ? undefined
        : Number(input.estimatedProductionDays),
    description: input.description,
    tags,
    isNew: input.isNew,
    isBestSeller: input.isBestSeller,
    imageTone: input.imageTone,
    images: (input.images ?? []).map((url) => url.trim()).filter(Boolean),
    laborCost: input.laborCost === "" || input.laborCost === undefined ? undefined : Number(input.laborCost),
  };
}

function revalidateCatalogPaths(slug: string, categorySlug: string) {
  revalidatePath("/");
  revalidatePath("/loja");
  revalidatePath(`/produto/${slug}`);
  revalidatePath(`/categorias/${categorySlug}`);
}

/** Best-effort: uma falha ao salvar o BOM não deve desfazer a gravação do produto em si. */
async function persistMaterialUsages(slug: string, usages: ProductFormInput["materialUsages"]) {
  try {
    await setUsagesForProduct(
      slug,
      (usages ?? []).map((usage) => ({ rawMaterialId: usage.rawMaterialId, quantity: usage.quantity })),
    );
  } catch {
    // Sem banco configurado (fase de fallback) ou erro pontual — ignorado de propósito.
  }
}

export async function createProductAction(input: ProductFormInput): Promise<ProductMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() => createProduct(toStoredProduct(parsed.data)));
  if (result.success) {
    await persistMaterialUsages(result.product.slug, parsed.data.materialUsages);
    revalidateCatalogPaths(result.product.slug, result.product.categorySlug);
  }
  return result;
}

export async function updateProductAction(slug: string, input: ProductFormInput): Promise<ProductMutationResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const stored = toStoredProduct(parsed.data);
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() => updateProduct(slug, {
    name: stored.name,
    categorySlug: stored.categorySlug,
    type: stored.type,
    price: stored.price,
    compareAtPrice: stored.compareAtPrice,
    stock: stored.stock,
    materials: stored.materials,
    scaleOptions: stored.scaleOptions,
    weightGrams: stored.weightGrams,
    dimensions: stored.dimensions,
    estimatedProductionDays: stored.estimatedProductionDays,
    description: stored.description,
    tags: stored.tags,
    isNew: stored.isNew,
    isBestSeller: stored.isBestSeller,
    imageTone: stored.imageTone,
    images: stored.images,
    laborCost: stored.laborCost,
  }));
  if (result.success) {
    await persistMaterialUsages(result.product.slug, parsed.data.materialUsages);
    revalidateCatalogPaths(result.product.slug, result.product.categorySlug);
  }
  return result;
}

export async function deleteProductAction(slug: string, categorySlug: string): Promise<DeleteProductResult> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(() => deleteProduct(slug));
  if (result.success) revalidateCatalogPaths(slug, categorySlug);
  return result;
}
