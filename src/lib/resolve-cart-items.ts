import { getProduct } from "@/lib/demo-data";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackProducts } from "@/server/demo-fallback";
import type { Product } from "@/lib/types";
import type { OrderItem } from "@/server/types";

export type CartItemLine = { productSlug: string; material: string; color: string; quantity: number };

/**
 * Fetches the live catalog product for each cart line, keyed by slug — the
 * one place both order creation (which also needs stock/weight/dimensions
 * for the out-of-stock check and shipping quote) and abandoned-cart capture
 * (which only needs name/price) go to resolve a cart against the catalog.
 */
export async function fetchProductsForLines(lines: CartItemLine[]): Promise<Map<string, Product>> {
  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco — hoje a leitura real falharia sem Supabase configurado.
  const products = await Promise.all(
    lines.map((line) =>
      withReadFallback(() => getProduct(line.productSlug), fallbackProducts.find((p) => p.slug === line.productSlug)),
    ),
  );
  return new Map(products.filter((p): p is Product => Boolean(p)).map((p) => [p.slug, p] as const));
}

/**
 * Resolves cart lines (slug/material/color/quantity, all the client ever
 * sends) against the live catalog — price and name are never trusted from
 * the client. A line whose product no longer exists or has no fixed price
 * ("sob consulta") is silently dropped, same as a discontinued product
 * reaching checkout. Shared by order creation (checkout/actions.ts) and
 * abandoned-cart capture, so both resolve prices the same way.
 */
export async function resolveCartItems(
  lines: CartItemLine[],
  productsBySlug?: Map<string, Product>,
): Promise<OrderItem[]> {
  const products = productsBySlug ?? (await fetchProductsForLines(lines));

  return lines
    .map((line) => {
      const product = products.get(line.productSlug);
      if (!product || product.price === undefined) return null;
      return {
        productSlug: product.slug,
        name: product.name,
        categoryName: product.categoryName,
        material: line.material,
        color: line.color,
        quantity: line.quantity,
        price: product.price,
      };
    })
    .filter((item): item is OrderItem => Boolean(item));
}
