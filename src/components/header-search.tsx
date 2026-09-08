"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useProductSnapshot } from "@/hooks/use-product-snapshot";
import { matchesSearch } from "@/lib/search";
import { formatPrice } from "@/lib/format";
import { pixPrice } from "@/lib/money";

const MAX_SUGGESTIONS = 5;

export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { products } = useProductSnapshot();
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const term = query.trim();
    if (!term) return [];
    return products.filter((p) => matchesSearch(p, term)).slice(0, MAX_SUGGESTIONS);
  }, [products, query]);

  const close = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Pesquisar"
        className="-m-2 p-2 text-paper transition-colors hover:text-petrol"
      >
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Pesquisar">
          <div className="fixed inset-0 bg-ink/50" onClick={close} aria-hidden="true" />
          <div className="fixed inset-x-0 top-0 border-b border-paper/10 bg-ink text-paper shadow-lg">
            <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0 text-paper/50">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar produtos..."
                  className="min-w-0 flex-1 py-1 text-base text-paper outline-none placeholder:text-paper/40"
                />
                <button
                  type="button"
                  onClick={close}
                  aria-label="Fechar busca"
                  className="-m-2 shrink-0 p-2 text-paper/50 transition-colors hover:text-paper"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              {query.trim() && (
                <ul className="mt-4 max-h-[60vh] divide-y divide-paper/10 overflow-y-auto">
                  {results.length === 0 ? (
                    <li className="py-6 text-center text-sm text-paper/60">
                      Nenhum resultado para &ldquo;{query}&rdquo;.
                    </li>
                  ) : (
                    results.map((product) => (
                      <li key={product.slug}>
                        <Link
                          href={`/produto/${product.slug}`}
                          onClick={close}
                          className="flex items-center gap-3 py-3 transition-colors hover:bg-paper/5"
                        >
                          <span className="h-14 w-11 shrink-0 overflow-hidden bg-mist">
                            {product.images && product.images.length > 0 && (
                              <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                            )}
                          </span>
                          <span className="flex-1">
                            <span className="block text-sm text-paper">{product.name}</span>
                            <span className="label-caps block text-[10px] text-paper/60">{product.categoryName}</span>
                          </span>
                          <span className="shrink-0 text-sm font-medium text-paper">
                            {product.price !== undefined ? formatPrice(pixPrice(product.price)) : "Sob consulta"}
                          </span>
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              )}

              {query.trim() && (
                <Link
                  href={`/busca?q=${encodeURIComponent(query.trim())}`}
                  onClick={close}
                  className="label-caps mt-3 block border-t border-paper/10 py-3 text-center text-[11px] text-paper hover:text-petrol hover:underline"
                >
                  Ver todos os resultados
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
