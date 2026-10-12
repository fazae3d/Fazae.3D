import type { Product } from "@/lib/types";

/** Categoria "lixeira" para produtos recém-cadastrados que ainda não foram classificados: não aparece no menu, nas listas nem no sitemap. */
export const UNCATEGORIZED_SLUG = "sem-categoria";

/** O que o cliente pode ver e comprar: tudo, menos os rascunhos (produtos ocultos). */
export function isPubliclyVisible(product: Pick<Product, "hidden">) {
  return !product.hidden;
}

export function publicProducts<T extends Pick<Product, "hidden">>(products: T[]): T[] {
  return products.filter(isPubliclyVisible);
}

export function publicCategories<T extends { slug: string }>(categories: T[]): T[] {
  return categories.filter((c) => c.slug !== UNCATEGORIZED_SLUG);
}
