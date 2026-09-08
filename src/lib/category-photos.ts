/**
 * Stand-in banner photo per category — crops from AI-generated mood shots
 * (public/categories/*.png), not real photography yet. Swap for real
 * photos as they're shot; the category's own name/description (see
 * src/lib/categories.ts) is what actually renders as text, never anything
 * baked into these images.
 */
type CategoryPhoto =
  | {
      /** Fixed banner height, image cropped to fill it (object-cover) — for tight portrait crops that were never meant to show in full. */
      mode: "cover";
      src: string;
      position: string;
      heightClass: string;
    }
  | {
      /** Banner height follows the image's own aspect ratio, so the whole photo always shows — nothing is ever cropped. */
      mode: "fit";
      src: string;
      /** width / height of the source file, e.g. 1717 / 916. */
      aspectRatio: number;
    };

const BANNER_HEIGHT = "h-[220px] sm:h-[280px] lg:h-[320px]";

export const CATEGORY_PHOTOS: Record<string, CategoryPhoto> = {
  "casa-decor": { mode: "cover", src: "/categories/casa-decor.png", position: "center 60%", heightClass: BANNER_HEIGHT },
  utilidades: { mode: "cover", src: "/categories/utilidades.png", position: "center 65%", heightClass: BANNER_HEIGHT },
  "geek-pop": { mode: "cover", src: "/categories/geek-pop.png", position: "center 55%", heightClass: BANNER_HEIGHT },
  decoracao: { mode: "cover", src: "/categories/decoracao.png", position: "center 60%", heightClass: BANNER_HEIGHT },
};

export function getCategoryPhoto(slug: string) {
  return CATEGORY_PHOTOS[slug];
}
