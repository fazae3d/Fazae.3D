"use client";

import { useState } from "react";
import { useCart } from "@/contexts/cart-context";
import type { OrderItem } from "@/server/types";

export function ReorderButton({ items }: { items: OrderItem[] }) {
  const { addLine } = useCart();
  const [added, setAdded] = useState(false);

  const handleReorder = () => {
    if (added) return;
    items.forEach((item) => {
      addLine({
        productSlug: item.productSlug,
        material: item.material,
        color: item.color,
        quantity: item.quantity,
      });
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleReorder}
      disabled={added}
      className="label-caps mt-2 inline-flex items-center gap-1.5 text-[11px] text-petrol hover:underline disabled:opacity-70"
    >
      {added && (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12l5 5L20 6" />
        </svg>
      )}
      {added ? "Adicionado ao carrinho" : "Comprar novamente"}
    </button>
  );
}
