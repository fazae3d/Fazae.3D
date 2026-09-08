import { getProductIcon } from "./product-icons";
import { getProductPhoto } from "./product-photos";
import { PlaceholderPhoto, type PlaceholderTone } from "@/components/placeholder-photo";

type ProductArtProps = {
  slug: string;
  className?: string;
  tone?: PlaceholderTone;
};

/**
 * Stand-in "photo" for a product, in order of preference: a real (if
 * AI-generated) product photo crop, then a hand-drawn low-poly icon on a
 * dark studio backdrop, then the plain gradient PlaceholderPhoto.
 */
export function ProductArt({ slug, className = "", tone = "ink" }: ProductArtProps) {
  const photo = getProductPhoto(slug);
  if (photo) {
    return (
      <div className={`relative overflow-hidden bg-mist ${className}`}>
        <img src={photo} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  const Icon = getProductIcon(slug);
  if (!Icon) return <PlaceholderPhoto tone={tone} className={className} />;

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        background:
          "radial-gradient(120% 90% at 50% 30%, #232323 0%, #111111 70%, #0a0a0a 100%)",
      }}
    >
      <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/40 to-transparent" />
      <Icon className="absolute inset-0 h-full w-full p-[18%] drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]" />
    </div>
  );
}
