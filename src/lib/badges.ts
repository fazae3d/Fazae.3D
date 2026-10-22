import type { Product } from "./types";

export const LOW_STOCK_THRESHOLD = 5;
/** O selo "Últimas peças" da vitrine só aparece com 2 ou menos: escassez em quase tudo vira ruído e perde credibilidade. */
export const SCARCITY_BADGE_THRESHOLD = 2;

export type BadgeTone = "ink" | "petrol" | "sand";

export type ProductBadge = { label: string; tone: BadgeTone };

/** Peça feita sob encomenda não tem estoque: ela é produzida quando o pedido chega, então nunca está "esgotada". */
export function isMadeToOrder(product: Product) {
  return product.type === "sob_encomenda";
}

/**
 * A card shows at most one badge, stacking "Novo" + "Best Seller" +
 * "Oferta" on the same corner reads as noise, not signal. Priority order:
 * esgotado > best seller > novidade > oferta > estoque baixo > sob encomenda.
 */
export function getPrimaryBadge(product: Product): ProductBadge | null {
  if (isSoldOut(product)) return { label: "Esgotado", tone: "ink" };
  if (product.isBestSeller) return { label: "Best Seller", tone: "ink" };
  if (product.isNew) return { label: "Novo", tone: "petrol" };
  if (product.compareAtPrice) return { label: "Oferta", tone: "sand" };
  if (!isMadeToOrder(product) && product.stock <= SCARCITY_BADGE_THRESHOLD) return { label: "Últimas peças", tone: "sand" };
  if (isMadeToOrder(product)) return { label: "Sob encomenda", tone: "sand" };
  return null;
}

export function isSoldOut(product: Product) {
  return !isMadeToOrder(product) && product.stock <= 0;
}
