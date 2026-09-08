import type { Product } from "./types";

export const LOW_STOCK_THRESHOLD = 5;

export type BadgeTone = "ink" | "petrol" | "sand";

export type ProductBadge = { label: string; tone: BadgeTone };

/**
 * A card shows at most one badge — stacking "Novo" + "Best Seller" +
 * "Oferta" on the same corner reads as noise, not signal. Priority order:
 * esgotado > best seller > novidade > oferta > estoque baixo.
 */
export function getPrimaryBadge(product: Product): ProductBadge | null {
  if (product.stock <= 0) return { label: "Esgotado", tone: "ink" };
  if (product.isBestSeller) return { label: "Best Seller", tone: "ink" };
  if (product.isNew) return { label: "Novo", tone: "petrol" };
  if (product.compareAtPrice) return { label: "Oferta", tone: "sand" };
  if (product.stock <= LOW_STOCK_THRESHOLD) return { label: "Últimas peças", tone: "sand" };
  return null;
}

export function isSoldOut(product: Product) {
  return product.stock <= 0;
}
