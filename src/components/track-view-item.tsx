"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/analytics";

/** Avisa o Google Analytics que a página de um produto foi vista (só dispara com cookies de medição aceitos). */
export function TrackViewItem({ slug, name, price, category }: { slug: string; name: string; price?: number; category: string }) {
  useEffect(() => {
    trackEvent("view_item", {
      currency: "BRL",
      value: price,
      items: [{ item_id: slug, item_name: name, item_category: category, price }],
    });
  }, [slug, name, price, category]);
  return null;
}
