import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { CatalogView } from "@/components/catalog-view";
import { getAllCategories, getAllProducts } from "@/lib/demo-data";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCategories, fallbackProducts } from "@/server/demo-fallback";

export const metadata: Metadata = {
  title: "Loja",
  description: "Explore todo o catálogo de impressão 3D da Fazaê: decoração, geek & pop, casa e utilidades.",
};

export default async function LojaPage({ searchParams }: PageProps<"/loja">) {
  const params = await searchParams;
  const filtro = typeof params.filtro === "string" ? params.filtro : undefined;
  const initialFilter = filtro === "novidades" || filtro === "mais-vendidos" ? filtro : undefined;
  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco — hoje a leitura real falharia sem Supabase configurado.
  const [products, categories] = await Promise.all([
    withReadFallback(() => getAllProducts(), fallbackProducts),
    withReadFallback(() => getAllCategories(), fallbackCategories),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Loja" }]} />
      <h1 className="font-display mb-10 text-3xl sm:text-4xl">Loja</h1>
      <CatalogView products={products} categories={categories} initialFilter={initialFilter} />
    </div>
  );
}
