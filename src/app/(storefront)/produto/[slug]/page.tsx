import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Accordion } from "@/components/accordion";
import { Breadcrumb } from "@/components/breadcrumb";
import { ProductGallery } from "@/components/product-gallery";
import { ProductGrid } from "@/components/product-grid";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { RecentlyViewed } from "@/components/recently-viewed";
import { SectionHeading } from "@/components/section-heading";
import {
  getAllProducts,
  getProduct,
  getProductsByCategory,
  getRelatedProducts,
} from "@/lib/demo-data";
import { demoReviews } from "@/lib/reviews";
import { SITE_URL } from "@/lib/site-config";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackProducts } from "@/server/demo-fallback";

export async function generateStaticParams() {
  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco — hoje a leitura real falharia sem Supabase configurado.
  const products = await withReadFallback(() => getAllProducts(), fallbackProducts);
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/produto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await withReadFallback(
    () => getProduct(slug),
    fallbackProducts.find((p) => p.slug === slug),
  );
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
  };
}

export default async function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
  const product = await withReadFallback(
    () => getProduct(slug),
    fallbackProducts.find((p) => p.slug === slug),
  );
  if (!product) notFound();

  const [related, categoryProducts] = await Promise.all([
    withReadFallback(
      () => getRelatedProducts(product),
      fallbackProducts.filter((p) => product.relatedSlugs?.includes(p.slug)),
    ),
    withReadFallback(
      () => getProductsByCategory(product.categorySlug),
      fallbackProducts.filter((p) => p.categorySlug === product.categorySlug),
    ),
  ]);
  const youMayLike = categoryProducts
    .filter((p) => p.slug !== product.slug && !related.some((r) => r.slug === p.slug))
    .slice(0, 4);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    category: product.categoryName,
    sku: product.slug,
    ...(product.price !== undefined
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "BRL",
            price: product.price.toFixed(2),
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/produto/${product.slug}`,
          },
        }
      : {}),
    // No aggregateRating here: the on-page review stats are synthetic demo
    // data (see lib/reviews.ts). Publishing fake ratings in structured data
    // that search engines index is both misleading and a rich-results
    // policy violation — add this back only once reviews are real.
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <Breadcrumb
        items={[
          { label: "Início", href: "/" },
          { label: "Loja", href: "/loja" },
          { label: product.categoryName, href: `/categorias/${product.categorySlug}` },
          { label: product.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery product={product} />
        <ProductPurchasePanel product={product} />
      </div>

      <div className="mt-16 grid grid-cols-1 gap-12 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Accordion
            items={[
              { title: "Descrição", content: product.description },
              {
                title: "Materiais e especificações",
                content: (
                  <ul className="space-y-1">
                    <li>Categoria: {product.categoryName}</li>
                    <li>Materiais disponíveis: {product.materials.map((m) => m.material).join(", ")}</li>
                    {product.scaleOptions.length > 0 && <li>Escalas: {product.scaleOptions.join(", ")}</li>}
                    {product.weightGrams && <li>Peso aproximado: {product.weightGrams}g</li>}
                    {product.dimensions && <li>Dimensões: {product.dimensions}</li>}
                    {product.type === "sob_encomenda" && product.estimatedProductionDays && (
                      <li>Prazo estimado de produção: {product.estimatedProductionDays} dia(s)</li>
                    )}
                  </ul>
                ),
              },
            ]}
          />
        </div>
      </div>

      <section id="avaliacoes" className="mt-16 border-t border-paper/15 pt-12">
        <SectionHeading eyebrow="Avaliações" title="O que dizem sobre esse produto" className="mb-8" />
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {demoReviews.map((review, i) => (
            <div key={i} className="flex h-full flex-col border border-paper/15 p-7">
              <div className="mb-4 flex gap-0.5" aria-label={`${review.rating} de 5 estrelas`}>
                {Array.from({ length: 5 }).map((_, star) => (
                  <span key={star} className={star < review.rating ? "text-petrol" : "text-graphite/30"}>
                    ★
                  </span>
                ))}
              </div>
              <p className="flex-1 text-sm text-graphite">&ldquo;{review.text}&rdquo;</p>
              <p className="mt-5 text-sm text-paper">{review.author}</p>
            </div>
          ))}
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-16 border-t border-paper/15 pt-12">
          <SectionHeading eyebrow="Cross-selling" title="Combine com essa peça" className="mb-8" />
          <ProductGrid products={related} />
        </section>
      )}

      {youMayLike.length > 0 && (
        <section className="mt-16 border-t border-paper/15 pt-12">
          <SectionHeading title="Você também pode gostar" className="mb-8" />
          <ProductGrid products={youMayLike} />
        </section>
      )}

      <RecentlyViewed currentSlug={product.slug} />
    </div>
  );
}
