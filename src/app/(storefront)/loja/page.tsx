import { pageMeta } from "@/lib/seo";
import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { CatalogView } from "@/components/catalog-view";
import { getAllCategories, getAllProducts } from "@/lib/demo-data";
import { withReadFallback } from "@/lib/db-fallback";
import { publicCategories, publicProducts } from "@/lib/visibility";
import { fallbackCategories, fallbackProducts } from "@/server/demo-fallback";

// Filtros e ordenação (?categoria=, ?ordenar=...) geram a mesma página: o Google deve indexar só a principal.
export const metadata: Metadata = pageMeta({
  title: "Loja de peças impressas em 3D",
  description: "Chaveiros, decoração, itens geek e utilidades impressos em 3D. Compre online na Fazaê, com entrega rápida em Natal e Parnamirim e envio para todo o Brasil.",
  path: "/loja",
});

// Sem ler searchParams no servidor: a página fica estática (CDN) e o CatalogView lê os filtros da URL no navegador.
export default async function LojaPage() {
  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco — hoje a leitura real falharia sem Supabase configurado.
  const [allProducts, allCategories] = await Promise.all([
    withReadFallback(() => getAllProducts(), fallbackProducts),
    withReadFallback(() => getAllCategories(), fallbackCategories),
  ]);
  const products = publicProducts(allProducts);
  const categories = publicCategories(allCategories);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Loja" }]} />
      <h1 className="font-display mb-10 text-3xl sm:text-4xl">Loja</h1>
      <CatalogView products={products} categories={categories} />
    </div>
  );
}
