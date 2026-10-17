import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Accordion } from "@/components/accordion";
import { Breadcrumb } from "@/components/breadcrumb";
import { ProductGallery } from "@/components/product-gallery";
import { ProductGrid } from "@/components/product-grid";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { TrackViewItem } from "@/components/track-view-item";
import { RecentlyViewed } from "@/components/recently-viewed";
import { SectionHeading } from "@/components/section-heading";
import {
  getAllProducts,
  getProduct,
  getProductsByCategory,
  getRelatedProducts,
} from "@/lib/demo-data";
import { SITE_URL } from "@/lib/site-config";
import { publicProducts } from "@/lib/visibility";
import { isSoldOut } from "@/lib/badges";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackProducts } from "@/server/demo-fallback";
import { getPublishedReviews, getReviewStats } from "@/server/repositories/review-repository";

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
  if (!product || product.hidden) return {};
  const flat = product.description.replace(/\s+/g, " ").trim();
  // Corta na última frase completa que cabe em ~155 caracteres (sem reticências); se não houver, no fim de uma palavra.
  let description = flat;
  if (flat.length > 155) {
    const cut = flat.slice(0, 155);
    const sentenceEnd = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
    description = sentenceEnd > 70 ? cut.slice(0, sentenceEnd + 1) : `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:\-–]$/, "")}.`;
  }
  const image = product.images?.[0];
  return {
    title: `${product.name} | Impressão 3D`,
    description,
    alternates: { canonical: `/produto/${product.slug}` },
    openGraph: {
      type: "website",
      locale: "pt_BR",
      siteName: "Fazaê",
      title: product.name,
      description,
      url: `/produto/${product.slug}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: { card: "summary_large_image", title: product.name, description, ...(image ? { images: [image] } : {}) },
  };
}

export default async function ProductPage({ params }: PageProps<"/produto/[slug]">) {
  const { slug } = await params;
  const product = await withReadFallback(
    () => getProduct(slug),
    fallbackProducts.find((p) => p.slug === slug),
  );
  if (!product || product.hidden) notFound();

  const [related, categoryProducts, reviews, reviewStats] = await Promise.all([
    withReadFallback(
      () => getRelatedProducts(product),
      fallbackProducts.filter((p) => product.relatedSlugs?.includes(p.slug)),
    ),
    withReadFallback(
      () => getProductsByCategory(product.categorySlug),
      fallbackProducts.filter((p) => p.categorySlug === product.categorySlug),
    ),
    withReadFallback(() => getPublishedReviews(product.slug), []),
    withReadFallback(() => getReviewStats(product.slug), { average: 0, count: 0 }),
  ]);
  const youMayLike = publicProducts(categoryProducts)
    .filter((p) => p.slug !== product.slug && !related.some((r) => r.slug === p.slug))
    .slice(0, 4);

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    category: product.categoryName,
    sku: product.slug,
    brand: { "@type": "Brand", name: "Fazaê" },
    ...(product.images && product.images.length > 0 ? { image: product.images } : {}),
    ...(product.price !== undefined
      ? {
          offers: {
            "@type": "Offer",
            priceCurrency: "BRL",
            price: product.price.toFixed(2),
            // O Google pede uma validade para o preço; renovamos a cada geração da página (a cada minuto no máximo).
            priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
            itemCondition: "https://schema.org/NewCondition",
            hasMerchantReturnPolicy: {
              "@type": "MerchantReturnPolicy",
              applicableCountry: "BR",
              returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
              merchantReturnDays: 7,
              merchantReturnLink: `${SITE_URL}/trocas-e-devolucoes`,
            },
            seller: { "@type": "Organization", name: "Fazaê 3D" },
            availability: isSoldOut(product) ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            url: `${SITE_URL}/produto/${product.slug}`,
          },
        }
      : {}),
    ...(reviewStats.count > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: reviewStats.average.toFixed(1),
            reviewCount: reviewStats.count,
          },
        }
      : {}),
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
        <TrackViewItem slug={product.slug} name={product.name} price={product.price} category={product.categoryName} />
        <ProductGallery product={product} />
        <ProductPurchasePanel product={product} reviewStats={reviewStats} />
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
        {reviews.length === 0 ? (
          <p className="text-sm text-graphite">
            Ainda não há avaliações. Seja a primeira pessoa a avaliar depois de receber o produto.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {reviews.map((review) => (
              <div key={review.id} className="flex h-full flex-col border border-paper/15 p-7">
                <div className="mb-4 flex gap-0.5" aria-label={`${review.rating} de 5 estrelas`}>
                  {Array.from({ length: 5 }).map((_, star) => (
                    <span key={star} className={star < review.rating ? "text-petrol" : "text-graphite/30"}>
                      ★
                    </span>
                  ))}
                </div>
                {review.text && <p className="flex-1 text-sm text-graphite">&ldquo;{review.text}&rdquo;</p>}
                <p className="mt-5 text-sm text-paper">{review.authorName}</p>
              </div>
            ))}
          </div>
        )}
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
