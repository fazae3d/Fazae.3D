"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Select, type SelectOption } from "@/components/select";

type Filters = { q: string; category: string; status: string; sort: string };

/**
 * Filtros da lista de produtos que se aplicam sozinhos: escolher uma opção filtra na hora, e a busca filtra
 * enquanto você digita (com uma pequena pausa). Usa router.replace, então a tela não recarrega e o campo de
 * busca não perde o foco.
 */
export function ProductFilters({
  initial,
  categoryOptions,
  statusOptions,
  sortOptions,
  defaultSort,
}: {
  initial: Filters;
  categoryOptions: SelectOption[];
  statusOptions: SelectOption[];
  sortOptions: SelectOption[];
  defaultSort: string;
}) {
  const router = useRouter();
  const [filters, setFilters] = useState<Filters>(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const go = (next: Filters) => {
    const params = new URLSearchParams();
    if (next.q.trim()) params.set("q", next.q.trim());
    if (next.category) params.set("category", next.category);
    if (next.status) params.set("status", next.status);
    if (next.sort && next.sort !== defaultSort) params.set("sort", next.sort);
    const qs = params.toString();
    router.replace(qs ? `/admin/produtos?${qs}` : "/admin/produtos");
  };

  const update = (patch: Partial<Filters>, debounce = false) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    if (timer.current) clearTimeout(timer.current);
    if (debounce) timer.current = setTimeout(() => go(next), 350);
    else go(next);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const hasFilters = filters.q || filters.category || filters.status || filters.sort !== defaultSort;

  return (
    <div className="mb-6 flex flex-wrap gap-3">
      <input
        type="text"
        value={filters.q}
        onChange={(e) => update({ q: e.target.value }, true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") update({}, false);
        }}
        placeholder="Buscar por produto ou categoria"
        className="min-w-[220px] flex-1 border border-mist px-3 py-2.5 text-base outline-none focus:border-petrol sm:text-sm"
      />
      <Select
        value={filters.category}
        onChange={(category) => update({ category })}
        className="min-w-[180px] border border-mist bg-paper px-3 py-2.5 text-sm focus:border-petrol"
        options={categoryOptions}
      />
      <Select
        value={filters.status}
        onChange={(status) => update({ status })}
        className="min-w-[160px] border border-mist bg-paper px-3 py-2.5 text-sm focus:border-petrol"
        options={statusOptions}
      />
      <Select
        value={filters.sort}
        onChange={(sort) => update({ sort })}
        className="min-w-[160px] border border-mist bg-paper px-3 py-2.5 text-sm focus:border-petrol"
        options={sortOptions}
      />
      {hasFilters && (
        <Link
          href="/admin/produtos"
          onClick={() => setFilters({ q: "", category: "", status: "", sort: defaultSort })}
          className="label-caps flex items-center px-2 text-[11px] text-graphite hover:text-petrol"
        >
          Limpar
        </Link>
      )}
    </div>
  );
}
