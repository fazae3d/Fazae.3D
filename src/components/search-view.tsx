"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ProductGrid } from "./product-grid";
import { useProductSnapshot } from "@/hooks/use-product-snapshot";
import { matchesSearch } from "@/lib/search";

export function SearchView({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const { products } = useProductSnapshot();

  const results = useMemo(() => {
    const term = query.trim();
    if (!term) return [];
    return products.filter((p) => matchesSearch(p, term));
  }, [products, query]);

  const handleChange = (value: string) => {
    setQuery(value);
    router.replace(value ? `/busca?q=${encodeURIComponent(value)}` : "/busca", { scroll: false });
  };

  return (
    <div>
      <div className="relative mb-10 max-w-xl">
        <input
          autoFocus
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Buscar produtos..."
          className="w-full border-b border-paper/15 bg-transparent px-1 py-3 text-lg text-paper outline-none placeholder:text-paper/40 focus:border-petrol"
        />
      </div>

      {!query.trim() ? (
        <p className="text-sm text-graphite">Digite algo para buscar no catálogo da Fazaê.</p>
      ) : (
        <>
          <p className="mb-6 text-sm text-graphite">
            {results.length} resultado{results.length === 1 ? "" : "s"} para &ldquo;{query}&rdquo;
          </p>
          <ProductGrid products={results} />
        </>
      )}
    </div>
  );
}
