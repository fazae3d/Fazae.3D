import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionHeading } from "@/components/section-heading";
import { CatalogView } from "@/components/catalog-view";
import { ButtonLink } from "@/components/button";
import { Breadcrumb } from "@/components/breadcrumb";
import { CATEGORIES, getCategory } from "@/lib/categories";
import { getCategoryPhoto } from "@/lib/category-photos";
import { getAllProducts } from "@/lib/demo-data";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackProducts } from "@/server/demo-fallback";

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/categorias/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategory(slug);
  return { title: category?.label ?? "Categoria" };
}

export default async function CategoryPage({ params }: PageProps<"/categorias/[slug]">) {
  const { slug } = await params;
  const category = getCategory(slug);
  if (!category) notFound();

  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco — hoje a leitura real falharia sem Supabase configurado.
  const products = await withReadFallback(() => getAllProducts(), fallbackProducts);
  const hasItems = products.some((p) => p.categorySlug === category.slug);
  const photo = getCategoryPhoto(category.slug);

  return (
    <div>
      {photo && (
        <section
          className={`relative flex items-end overflow-hidden bg-ink text-paper ${
            photo.mode === "cover" ? photo.heightClass : "w-full"
          }`}
          style={photo.mode === "fit" ? { aspectRatio: photo.aspectRatio } : undefined}
        >
          <img
            src={photo.src}
            alt=""
            className={`absolute inset-0 h-full w-full ${photo.mode === "cover" ? "object-cover" : "object-contain"}`}
            style={photo.mode === "cover" ? { objectPosition: photo.position } : undefined}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10" />
          <div className="relative mx-auto w-full max-w-7xl px-4 pb-8 sm:px-6 lg:px-8">
            <p className="label-caps text-xs text-petrol">Catálogo</p>
            <h1 className="font-display mt-2 text-4xl sm:text-5xl">{category.label}</h1>
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Loja", href: "/loja" }, { label: category.label }]} />
        {photo ? (
          <p className="max-w-xl text-graphite">{category.description}</p>
        ) : (
          <SectionHeading eyebrow="Catálogo" title={category.label} subtitle={category.description} />
        )}

        {hasItems ? (
          <div className="mt-12">
            <CatalogView products={products} fixedCategory={category.slug} />
          </div>
        ) : (
          <p className="mt-12 max-w-md text-graphite">
            Ainda estamos organizando o catálogo completo desta categoria.
          </p>
        )}

        <div className="mt-16 flex flex-col items-start gap-4 border border-paper/10 bg-mist p-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-md text-paper/85">
            Não achou a peça certa em {category.label.toLowerCase()}? A gente também imprime sob
            encomenda, do seu jeito.
          </p>
          <ButtonLink href="/personalizado" variant="primary" className="shrink-0">
            Fazer orçamento
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
