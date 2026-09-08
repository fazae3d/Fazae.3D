import type { Metadata } from "next";
import { Breadcrumb } from "@/components/breadcrumb";
import { SearchView } from "@/components/search-view";

export const metadata: Metadata = {
  title: "Busca",
};

export default async function BuscaPage({ searchParams }: PageProps<"/busca">) {
  const params = await searchParams;
  const q = typeof params.q === "string" ? params.q : "";

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Busca" }]} />
      <h1 className="font-display mb-8 text-3xl sm:text-4xl">Busca</h1>
      <SearchView initialQuery={q} />
    </div>
  );
}
