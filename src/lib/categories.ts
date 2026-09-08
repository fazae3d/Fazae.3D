export type CategoryDef = {
  slug: string;
  label: string;
  description: string;
};

/**
 * Static category taxonomy from the Fazaê brand reference — not the real
 * Category model yet (that lands with the database/catalog phase, see
 * TODO(fase DB) notes elsewhere).
 */
export const CATEGORIES: CategoryDef[] = [
  {
    slug: "decoracao",
    label: "Decoração",
    description: "Peças decorativas para dar personalidade a qualquer ambiente.",
  },
  {
    slug: "geek-pop",
    label: "Geek & Pop",
    description: "Colecionáveis, esculturas geométricas e cultura geek em 3D.",
  },
  {
    slug: "casa-decor",
    label: "Casa & Decor",
    description: "Vasos, organizadores e objetos que combinam forma e função.",
  },
  {
    slug: "utilidades",
    label: "Utilidades",
    description: "Suportes, ganchos e soluções práticas para o dia a dia.",
  },
];

export function getCategory(slug: string) {
  return CATEGORIES.find((c) => c.slug === slug);
}
