import Link from "next/link";
import { SITE_URL } from "@/lib/site-config";

type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.label,
      item: `${SITE_URL}${item.href ?? ""}`,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <nav aria-label="Breadcrumb" className="mb-8 flex items-center gap-1.5 text-[11px] tracking-wide text-graphite">
        {items.map((item, i) => (
          <span key={item.label} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-petrol">
                {item.label}
              </Link>
            ) : (
              <span className="text-paper">{item.label}</span>
            )}
            {i < items.length - 1 && (
              <span aria-hidden="true" className="text-graphite/50">
                ›
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
