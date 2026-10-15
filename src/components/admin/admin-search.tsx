"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { adminSearchAction, type AdminSearchHit } from "@/app/admin/search-actions";
import { AdminIcon } from "./admin-icons";
import { NAV_LINKS } from "./admin-nav";

type Result = { key: string; group: string; title: string; subtitle?: string; href: string };

const SHORTCUTS: Result[] = [
  { key: "s-orc", group: "Atalhos", title: "Novo orçamento", href: "/admin/orcamentos/novo" },
  { key: "s-venda", group: "Atalhos", title: "Lançar venda", href: "/admin/vendas/nova" },
  { key: "s-prod", group: "Atalhos", title: "Cadastrar produto", href: "/admin/produtos/novo" },
];

/** Busca global (Ctrl+K ou botão): telas do painel, pedidos, orçamentos, clientes e produtos. */
export function AdminSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<AdminSearchHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHits([]);
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const timer = setTimeout(async () => {
      const result = await adminSearchAction(query);
      if (!cancelled) {
        setHits(result);
        setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open]);

  const results = useMemo<Result[]>(() => {
    const term = query.trim().toLowerCase();
    const pages: Result[] = NAV_LINKS.filter((l) => !term || l.label.toLowerCase().includes(term)).map((l) => ({
      key: `p-${l.href}`,
      group: "Telas",
      title: l.label,
      href: l.href,
    }));
    const shortcuts = SHORTCUTS.filter((s) => !term || s.title.toLowerCase().includes(term));
    const data: Result[] = hits.map((h, i) => ({ key: `h-${i}`, group: h.group, title: h.title, subtitle: h.subtitle, href: h.href }));
    return [...data, ...shortcuts, ...pages].slice(0, 14);
  }, [query, hits]);

  const go = (result?: Result) => {
    if (!result) return;
    setOpen(false);
    router.push(result.href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[active]);
    }
  };

  let lastGroup = "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-mist px-3 py-2 text-left text-sm text-graphite transition-colors hover:border-petrol sm:max-w-md"
        aria-label="Buscar no painel"
      >
        <AdminIcon name="search" className="h-4 w-4" />
        <span className="flex-1 truncate">Buscar pedido, cliente, produto…</span>
        <kbd className="hidden rounded border border-mist px-1.5 py-0.5 text-[11px] sm:block">Ctrl K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center bg-black/60 px-4 pt-[12vh]" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-label="Busca do painel"
            className="w-full max-w-xl overflow-hidden rounded-xl border border-mist bg-paper shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-mist px-4">
              <AdminIcon name="search" className="h-4 w-4 text-graphite" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
                onKeyDown={onInputKey}
                placeholder="Buscar pedido, orçamento, cliente, produto ou tela"
                className="w-full bg-transparent py-4 text-sm outline-none"
              />
              {loading ? <span className="text-xs text-graphite">buscando…</span> : null}
            </div>
            <ul className="max-h-[50vh] overflow-y-auto py-2">
              {results.length === 0 ? <li className="px-4 py-6 text-center text-sm text-graphite">Nada encontrado.</li> : null}
              {results.map((result, index) => {
                const header = result.group !== lastGroup;
                lastGroup = result.group;
                return (
                  <li key={result.key}>
                    {header ? <p className="px-4 pb-1 pt-3 text-[11px] font-medium text-graphite">{result.group}</p> : null}
                    <button
                      type="button"
                      onMouseEnter={() => setActive(index)}
                      onClick={() => go(result)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2 text-left text-sm ${index === active ? "bg-mist/70" : ""}`}
                    >
                      <span className="truncate">{result.title}</span>
                      {result.subtitle ? <span className="shrink-0 text-xs text-graphite">{result.subtitle}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
