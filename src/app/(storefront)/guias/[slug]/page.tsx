import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumb } from "@/components/breadcrumb";
import { ButtonLink } from "@/components/button";
import { JsonLd } from "@/components/json-ld";
import { GUIDES, getGuide } from "@/lib/guides";
import { SITE_URL } from "@/lib/site-config";

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

type GuideParams = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: GuideParams): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};
  return {
    title: guide.seoTitle,
    description: guide.description,
    alternates: { canonical: `/guias/${guide.slug}` },
    openGraph: { type: "article", title: guide.seoTitle, description: guide.description, url: `/guias/${guide.slug}` },
  };
}

export default async function GuidePage({ params }: GuideParams) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const others = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <article className="mx-auto max-w-2xl px-4 py-16 sm:px-6 lg:px-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: guide.title,
          description: guide.description,
          datePublished: guide.published,
          dateModified: guide.published,
          mainEntityOfPage: `${SITE_URL}/guias/${guide.slug}`,
          image: `${SITE_URL}/opengraph-image`,
          author: { "@type": "Organization", name: "Fazaê 3D" },
          publisher: { "@type": "Organization", name: "Fazaê 3D", logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-email.png` } },
        }}
      />
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Guias", href: "/guias" }, { label: guide.seoTitle }]} />
      <h1 className="font-display mb-6 text-3xl sm:text-4xl">{guide.title}</h1>

      <div className="space-y-8 text-graphite">
        {guide.blocks.map((block, i) => (
          <section key={i}>
            {block.heading && <h2 className="font-display mb-3 text-xl text-paper">{block.heading}</h2>}
            {block.paragraphs?.map((p) => (
              <p key={p} className="mb-3 leading-relaxed">
                {p}
              </p>
            ))}
            {block.list && (
              <ul className="list-disc space-y-1.5 pl-5">
                {block.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-4 border border-paper/10 bg-mist p-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-sm text-paper/85">Quer uma peça assim? Veja o catálogo ou peça um orçamento personalizado.</p>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/loja" variant="secondary">
            Ver produtos
          </ButtonLink>
          <ButtonLink href="/personalizado" variant="primary">
            Fazer orçamento
          </ButtonLink>
        </div>
      </div>

      <div className="mt-12 border-t border-paper/15 pt-8">
        <p className="label-caps mb-3 text-xs text-graphite">Leia também</p>
        <ul className="space-y-2">
          {others.map((g) => (
            <li key={g.slug}>
              <Link href={`/guias/${g.slug}`} className="text-petrol hover:underline">
                {g.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}
