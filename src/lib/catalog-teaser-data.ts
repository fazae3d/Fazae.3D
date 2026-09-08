import type { PlaceholderTone } from "@/components/placeholder-photo";

export type CatalogTeaserItem = {
  slug: string;
  categorySlug: string;
  title: string;
  tone: PlaceholderTone;
};

/**
 * Static placeholder catalog, mirrors src/server/seed-data.ts so the
 * front-end has something to show before the real Fazaê database/catalog
 * phase lands. Each slug has a matching image (or hand-drawn icon fallback)
 * in src/components/illustrations/.
 */
export const CATALOG_TEASER: CatalogTeaserItem[] = [
  { slug: "caveira-geo", categorySlug: "decoracao", title: "Capacete Geo", tone: "ink" },
  { slug: "dragao-articulado", categorySlug: "geek-pop", title: "Losango Suspenso", tone: "street" },
  { slug: "vaso-prisma", categorySlug: "casa-decor", title: "Vaso Prisma", tone: "fitness" },
  { slug: "suporte-pulse", categorySlug: "utilidades", title: "Suporte Hex Pulse", tone: "ink" },
  { slug: "organizador-modular", categorySlug: "casa-decor", title: "Organizador Modular", tone: "ink" },
  { slug: "gancho-parede-x3", categorySlug: "utilidades", title: "Suporte para Fita", tone: "street" },
  { slug: "miniatura-rpg-guerreiro", categorySlug: "geek-pop", title: "Cão Low Poly", tone: "ink" },
  { slug: "luminaria-lowpoly", categorySlug: "decoracao", title: "Luminária Low Poly", tone: "fitness" },
];
