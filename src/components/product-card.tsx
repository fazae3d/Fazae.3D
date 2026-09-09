"use client";

import Link from "next/link";
import { useState } from "react";
import { getPrimaryBadge, isSoldOut } from "@/lib/badges";
import type { Product } from "@/lib/types";
import { Badge } from "./badge";
import { ProductArt } from "./illustrations/product-art";
import { PriceBlock } from "./price-block";
import { WishlistButton } from "./wishlist-button";
import { useCart } from "@/contexts/cart-context";

export function ProductCard({ product }: { product: Product }) {
  const { addLine } = useCart();
  const [adding, setAdding] = useState(false);
  const badge = getPrimaryBadge(product);
  const soldOut = isSoldOut(product);
  const canQuickAdd = product.price !== undefined && product.materials.length > 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canQuickAdd || adding) return;
    const firstMaterial = product.materials[0];
    addLine({
      productSlug: product.slug,
      material: firstMaterial.material,
      color: firstMaterial.colors[0],
      quantity: 1,
    });
    setAdding(true);
    setTimeout(() => setAdding(false), 1200);
  };

  return (
    <Link href={`/produto/${product.slug}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-mist">
        <div
          className={`h-full w-full transition-transform duration-500 group-hover:scale-105 ${
            soldOut ? "opacity-50" : ""
          }`}
        >
          {product.images && product.images.length > 0 ? (
            <img src={product.images[0]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <ProductArt slug={product.slug} tone={product.imageTone} className="h-full w-full" />
          )}
        </div>

        {badge && (
          <div className="absolute left-3 top-3">
            <Badge tone={badge.tone}>{badge.label}</Badge>
          </div>
        )}

        <WishlistButton slug={product.slug} className="absolute right-3 top-3" />

        {!soldOut && (
          <div className="absolute inset-x-0 bottom-0 translate-y-0 p-3 transition-transform duration-300 sm:translate-y-full sm:group-hover:translate-y-0">
            <button
              type="button"
              onClick={handleQuickAdd}
              disabled={adding}
              className="label-caps flex w-full items-center justify-center gap-1.5 rounded-full bg-petrol py-2.5 text-[11px] text-ink transition-colors hover:bg-paper disabled:opacity-70"
            >
              {adding && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12l5 5L20 6" />
                </svg>
              )}
              {adding ? "Adicionado" : "Adicionar rápido"}
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 space-y-1">
        <p className="label-caps text-[11px] text-graphite">{product.categoryName}</p>
        <h3 className="text-sm text-paper">{product.name}</h3>
        {product.price !== undefined ? (
          <PriceBlock price={product.price} compareAtPrice={product.compareAtPrice} size="sm" />
        ) : (
          <p className="text-sm font-semibold text-petrol">Sob consulta</p>
        )}
        {product.materials.length > 0 && (
          <p className="pt-1 text-xs text-graphite">
            {product.materials.map((m) => m.material).join(", ")}
          </p>
        )}
      </div>
    </Link>
  );
}
