"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductGrid } from "./product-grid";
import { useProductSnapshot } from "@/hooks/use-product-snapshot";
import { matchesSearch } from "@/lib/search";

export function SearchView({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const { products, categories, loaded } = useProductSnapshot();

  const results = useMemo(() => {
    const term = query.trim();
    if (!term) return [];
    return products.filter((p) => matchesSearch(p, term));
  }, [products, query]);

  const handleChange = (value: string) => {
    setQuery(value);
    router.replace(value ? `/busca?q=${encodeURIComponent(value)}` : "/busca", { scroll: false });
  };

  const term = query.trim();

  return (
    <div>
      <div className="relative mb-10 max-w-xl">
        <input
          autoFocus
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Buscar produtos..."
          aria-label="Buscar produtos"
          className="w-full border-b border-paper/15 bg-transparent px-1 py-3 text-lg text-paper outline-none placeholder:text-paper/40 focus:border-petrol"
        />
      </div>

      {!term ? (
        <p className="text-sm text-graphite">Digite algo para buscar no catálogo da Fazaê.</p>
      ) : !loaded ? (
        // Enquanto o catálogo carrega não dá para dizer "0 resultados": mostra o esqueleto da grade.
        <div aria-busy="true" aria-label="Buscando">
          <div className="skeleton mb-6 h-4 w-48" />
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-square w-full" />
                <div className="skeleton mt-3 h-3 w-24" />
                <div className="skeleton mt-2 h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="max-w-xl">
          <p className="text-lg">Não encontramos &ldquo;{term}&rdquo; no catálogo.</p>
          <p className="mt-2 text-sm text-graphite">Tente uma palavra mais simples (ex.: &ldquo;chaveiro&rdquo;, &ldquo;vaso&rdquo;, &ldquo;suporte&rdquo;) ou veja as categorias:</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.slug}
                href={`/categorias/${c.slug}`}
                className="rounded-full border border-paper/20 px-4 py-2 text-sm transition-colors hover:border-petrol hover:text-petrol"
              >
                {c.name}
              </Link>
            ))}
          </div>
          <div className="mt-8 border border-paper/15 p-5">
            <p className="font-medium">Não achou o que procura?</p>
            <p className="mt-1 text-sm text-graphite">A gente cria a peça do seu jeito. Conte a ideia e receba um orçamento.</p>
            <Link
              href="/personalizado"
              className="label-caps mt-4 inline-block rounded-full bg-petrol px-5 py-2.5 text-xs text-ink transition-colors hover:bg-paper"
            >
              Pedir peça personalizada
            </Link>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-6 text-sm text-graphite">
            {results.length} resultado{results.length === 1 ? "" : "s"} para &ldquo;{term}&rdquo;
          </p>
          <ProductGrid products={results} />
        </>
      )}
    </div>
  );
}
