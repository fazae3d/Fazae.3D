import { db } from "../db";
import { matchesSearch } from "@/lib/search";
import type { Product } from "@/lib/types";
import type { StoredProduct } from "../types";
import type { Prisma } from "@/generated/prisma/client";

type ProductRow = Prisma.ProductGetPayload<{ include: { category: true } }>;

function toProduct(row: ProductRow): Product {
  const { category, ...rest } = row;
  return {
    ...rest,
    type: rest.type as Product["type"],
    price: rest.price ?? undefined,
    compareAtPrice: rest.compareAtPrice ?? undefined,
    materials: rest.materials as Product["materials"],
    weightGrams: rest.weightGrams ?? undefined,
    dimensions: rest.dimensions ?? undefined,
    estimatedProductionDays: rest.estimatedProductionDays ?? undefined,
    isNew: rest.isNew || undefined,
    isBestSeller: rest.isBestSeller || undefined,
    relatedSlugs: rest.relatedSlugs.length > 0 ? rest.relatedSlugs : undefined,
    laborCost: rest.laborCost ?? undefined,
    categoryName: category.name,
  };
}

export async function getAllProducts(): Promise<Product[]> {
  const rows = await db.product.findMany({ include: { category: true } });
  return rows.map(toProduct);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  if (!slug) return undefined;
  const row = await db.product.findUnique({ where: { slug }, include: { category: true } });
  return row ? toProduct(row) : undefined;
}

export async function getProductsByCategory(categorySlug: string): Promise<Product[]> {
  const rows = await db.product.findMany({ where: { categorySlug }, include: { category: true } });
  return rows.map(toProduct);
}

export async function getRelatedProducts(product: Product): Promise<Product[]> {
  if (!product.relatedSlugs) return [];
  const rows = await db.product.findMany({
    where: { slug: { in: product.relatedSlugs } },
    include: { category: true },
  });
  const bySlug = new Map(rows.map((row) => [row.slug, toProduct(row)]));
  return product.relatedSlugs.map((slug) => bySlug.get(slug)).filter((p): p is Product => Boolean(p));
}

/** Matches against name, category, tags. */
export async function searchProducts(query: string): Promise<Product[]> {
  const term = query.trim().toLowerCase();
  if (!term) return [];

  const all = await getAllProducts();
  return all.filter((p) => matchesSearch(p, term));
}

export type ProductInput = StoredProduct;

export type ProductMutationResult = { success: true; product: Product } | { success: false; error: string };

export async function createProduct(input: ProductInput): Promise<ProductMutationResult> {
  const existing = await db.product.findUnique({ where: { slug: input.slug } });
  if (existing) {
    return { success: false, error: "Já existe um produto com esse slug." };
  }
  const category = await db.category.findUnique({ where: { slug: input.categorySlug } });
  if (!category) {
    return { success: false, error: "Categoria inválida." };
  }
  const created = await db.product.create({
    data: input as unknown as Prisma.ProductCreateInput,
    include: { category: true },
  });
  return { success: true, product: toProduct(created) };
}

export async function updateProduct(
  slug: string,
  input: Partial<Omit<ProductInput, "slug">>,
): Promise<ProductMutationResult> {
  const existing = await db.product.findUnique({ where: { slug } });
  if (!existing) return { success: false, error: "Produto não encontrado." };
  if (input.categorySlug) {
    const category = await db.category.findUnique({ where: { slug: input.categorySlug } });
    if (!category) return { success: false, error: "Categoria inválida." };
  }
  const updated = await db.product.update({
    where: { slug },
    data: input as unknown as Prisma.ProductUpdateInput,
    include: { category: true },
  });
  return { success: true, product: toProduct(updated) };
}

export type DeleteProductResult = { success: true } | { success: false; error: string };

export async function deleteProduct(slug: string): Promise<DeleteProductResult> {
  const existing = await db.product.findUnique({ where: { slug } });
  if (!existing) return { success: false, error: "Produto não encontrado." };
  await db.product.delete({ where: { slug } });
  return { success: true };
}
