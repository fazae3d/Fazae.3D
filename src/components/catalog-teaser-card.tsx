import Link from "next/link";
import type { PlaceholderTone } from "./placeholder-photo";
import { ProductArt } from "./illustrations/product-art";

type CatalogTeaserCardProps = {
  href: string;
  slug: string;
  category: string;
  title: string;
  tone?: PlaceholderTone;
};

/**
 * Static teaser card for the homepage catálogo section — not backed by the
 * Product model yet (that lands with the real Fazaê database/catalog).
 */
export function CatalogTeaserCard({ href, slug, category, title, tone }: CatalogTeaserCardProps) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden bg-mist">
        <ProductArt
          slug={slug}
          tone={tone}
          className="h-full w-full transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="mt-3 space-y-1">
        <p className="label-caps text-[11px] text-petrol">{category}</p>
        <h3 className="font-display text-base font-bold text-paper">{title}</h3>
      </div>
    </Link>
  );
}
