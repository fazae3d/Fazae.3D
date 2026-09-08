"use client";

import { useEffect } from "react";
import { useProductSnapshot } from "@/hooks/use-product-snapshot";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";
import { ProductGrid } from "./product-grid";
import { SectionHeading } from "./section-heading";

const MAX_SHOWN = 4;

export function RecentlyViewed({ currentSlug }: { currentSlug: string }) {
  const { slugs, markViewed } = useRecentlyViewed();
  const { products, loaded } = useProductSnapshot();

  useEffect(() => {
    markViewed(currentSlug);
  }, [currentSlug, markViewed]);

  if (!loaded) return null;

  const viewed = slugs
    .filter((slug) => slug !== currentSlug)
    .map((slug) => products.find((p) => p.slug === slug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p))
    .slice(0, MAX_SHOWN);

  if (viewed.length === 0) return null;

  return (
    <section className="mt-16 border-t border-paper/15 pt-12">
      <SectionHeading title="Vistos recentemente" className="mb-8" />
      <ProductGrid products={viewed} />
    </section>
  );
}
