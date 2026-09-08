"use client";

import { useMemo } from "react";
import { useCart } from "@/contexts/cart-context";
import { useProductSnapshot } from "@/hooks/use-product-snapshot";
import { ProductGrid } from "./product-grid";

/** Suggests products from the same category as what's already in the cart — shown at the moment of highest purchase intent, not only when the cart is empty. */
export function CartCrossSell({ limit = 4 }: { limit?: number }) {
  const { lines, getCartProduct } = useCart();
  const { products, loaded } = useProductSnapshot();

  const suggestions = useMemo(() => {
    if (!loaded || lines.length === 0) return [];
    const cartSlugs = new Set(lines.map((l) => l.productSlug));
    const cartCategories = new Set(
      lines.map((l) => getCartProduct(l.productSlug)?.categorySlug).filter(Boolean),
    );
    if (cartCategories.size === 0) return [];
    return products
      .filter((p) => !cartSlugs.has(p.slug) && cartCategories.has(p.categorySlug) && p.stock > 0)
      .slice(0, limit);
  }, [loaded, lines, products, getCartProduct, limit]);

  if (suggestions.length === 0) return null;

  return (
    <div>
      <p className="label-caps mb-4 text-[11px] text-graphite">Combina com o seu carrinho</p>
      <ProductGrid products={suggestions} />
    </div>
  );
}
