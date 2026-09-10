import Link from "next/link";
import type { PlaceholderTone } from "./placeholder-photo";
import { ProductArt } from "./illustrations/product-art";

type CatalogTeaserCardProps = {
  href: string;
  slug: string;
  category: string;
  title: string;
  tone?: PlaceholderTone;
  /** Specific photo for this tile, taking priority over the product-linked art. */
  photo?: string;
};

/**
 * Static teaser card for the homepage catálogo section — not backed by the
 * Product model yet (that lands with the real Fazaê database/catalog).
 */
export function CatalogTeaserCard({ href, slug, category, title, tone, photo }: CatalogTeaserCardProps) {
  return (
    <Link
      href={href}
      className="group block border border-paper/10 transition-colors duration-300 hover:border-petrol/50"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-mist">
        {photo ? (
          <img
            src={photo}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <ProductArt
            slug={slug}
            tone={tone}
            className="h-full w-full transition-transform duration-500 group-hover:scale-105"
          />
        )}
      </div>
      <div className="space-y-1 p-3">
        <p className="label-caps text-[11px] text-petrol">{category}</p>
        <h3 className="font-display text-base font-bold text-paper">{title}</h3>
      </div>
    </Link>
  );
}
