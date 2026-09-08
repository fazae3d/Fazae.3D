/**
 * Stand-in product photos — crops from a single AI-generated mood shot
 * (public/hero-collection.png), not real photography of actual Fazaê
 * inventory yet. Good enough to stop the catalog looking empty; swap for
 * real photos per product as they're shot.
 */
export const PRODUCT_PHOTOS: Record<string, string> = {
  "caveira-geo": "/products/caveira-geo.png",
  "dragao-articulado": "/products/dragao-articulado.png",
  "vaso-prisma": "/products/vaso-prisma.png",
  "suporte-pulse": "/products/suporte-pulse.png",
  "organizador-modular": "/products/organizador-modular.png",
  "gancho-parede-x3": "/products/gancho-parede-x3.png",
  "miniatura-rpg-guerreiro": "/products/miniatura-rpg-guerreiro.png",
  "luminaria-lowpoly": "/products/luminaria-lowpoly.png",
};

export function getProductPhoto(slug: string) {
  return PRODUCT_PHOTOS[slug];
}
