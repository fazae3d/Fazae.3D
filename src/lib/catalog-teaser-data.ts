import type { PlaceholderTone } from "@/components/placeholder-photo";

export type CatalogTeaserItem = {
  slug: string;
  categorySlug: string;
  title: string;
  tone: PlaceholderTone;
  /** Overrides the product-linked art with a specific photo for this homepage tile only. */
  photo?: string;
  /** Overrides the category's own label for this homepage tile only (link still points to the real category). */
  categoryLabel?: string;
};

/**
 * Static placeholder catalog, mirrors src/server/seed-data.ts so the
 * front-end has something to show before the real Fazaê database/catalog
 * phase lands. Each slug has a matching image (or hand-drawn icon fallback)
 * in src/components/illustrations/.
 */
export const CATALOG_TEASER: CatalogTeaserItem[] = [
  { slug: "caveira-geo", categorySlug: "decoracao", title: "Peças que transformam", tone: "ink", photo: "/teaser/decoracao.jpg" },
  { slug: "dragao-articulado", categorySlug: "geek-pop", title: "Ideias fora do comum", tone: "street" },
  { slug: "vaso-prisma", categorySlug: "casa-decor", title: "Leve sua criatividade com você", tone: "fitness", photo: "/teaser/casa-decor.jpg", categoryLabel: "Chaveiros" },
  { slug: "suporte-pulse", categorySlug: "utilidades", title: "Soluções que fazem sentido", tone: "ink", photo: "/teaser/utilidades.jpg" },
  { slug: "organizador-modular", categorySlug: "casa-decor", title: "Organizador Modular", tone: "ink" },
  { slug: "gancho-parede-x3", categorySlug: "utilidades", title: "Suporte para Fita", tone: "street" },
  { slug: "miniatura-rpg-guerreiro", categorySlug: "geek-pop", title: "Cão Low Poly", tone: "ink" },
  { slug: "luminaria-lowpoly", categorySlug: "decoracao", title: "Luminária Low Poly", tone: "fitness" },
];
