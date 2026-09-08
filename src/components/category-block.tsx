import Link from "next/link";
import { PlaceholderPhoto } from "./placeholder-photo";

type CategoryBlockProps = {
  href: string;
  tone: "fitness" | "surf" | "street";
  title: string;
  description: string;
  cta: string;
  image?: string;
  imagePosition?: string;
};

export function CategoryBlock({ href, tone, title, description, cta, image, imagePosition }: CategoryBlockProps) {
  return (
    <Link href={href} className="group relative block aspect-[3/4] overflow-hidden">
      <div className="h-full w-full transition-transform duration-700 group-hover:scale-105">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover"
            style={imagePosition ? { objectPosition: imagePosition } : undefined}
          />
        ) : (
          <PlaceholderPhoto tone={tone} className="h-full w-full" demoTag={false} />
        )}
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-ink/85 via-ink/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-6 text-paper sm:p-8">
        <h3 className="font-display text-2xl sm:text-3xl">{title}</h3>
        <p className="mt-2 max-w-xs text-sm text-paper/80">{description}</p>
        <span className="label-caps mt-5 inline-flex items-center gap-2 text-xs transition-colors group-hover:text-sand">
          {cta}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
            →
          </span>
        </span>
      </div>
    </Link>
  );
}
