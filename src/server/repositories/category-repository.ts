import { db } from "../db";
import type { Category } from "@/lib/types";

export async function getAllCategories(): Promise<Category[]> {
  return db.category.findMany({ orderBy: { name: "asc" } }) as Promise<Category[]>;
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  if (!slug) return undefined;
  const category = await db.category.findUnique({ where: { slug } });
  return (category as Category | null) ?? undefined;
}

export async function getCategoryName(slug: string): Promise<string> {
  const category = await getCategory(slug);
  return category?.name ?? "";
}

export type CategoryInput = Category;

export async function createCategory(input: CategoryInput): Promise<Category> {
  const existing = await getCategory(input.slug);
  if (existing) {
    throw new Error("Já existe uma categoria com esse slug.");
  }
  return db.category.create({ data: input }) as Promise<Category>;
}

export async function updateCategory(slug: string, input: Partial<Omit<Category, "slug">>): Promise<Category | null> {
  const existing = await getCategory(slug);
  if (!existing) return null;
  return db.category.update({ where: { slug }, data: input }) as Promise<Category>;
}

export type DeleteCategoryResult = { success: true } | { success: false; error: string };

export async function deleteCategory(slug: string): Promise<DeleteCategoryResult> {
  // A category backing live products can't just vanish — every product
  // would point at a slug nothing resolves, breaking every card that
  // reads categoryName. Reassign or remove those products first.
  const linkedCount = await db.product.count({ where: { categorySlug: slug } });
  if (linkedCount > 0) {
    return {
      success: false,
      error: `Esta categoria tem ${linkedCount} produto(s) vinculado(s). Remova ou reatribua-os antes de excluir a categoria.`,
    };
  }
  const existing = await getCategory(slug);
  if (!existing) return { success: false, error: "Categoria não encontrada." };
  await db.category.delete({ where: { slug } });
  return { success: true };
}
