"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export type NavLink = { href: string; label: string };
export type NavGroup = { label: string; href?: string; links: NavLink[] };

/**
 * Grouped by area of the business rather than a flat alphabetical list —
 * Dashboard/Encomendas/Financeiro/Clientes/Configurações each hold a single
 * page today, so they render as direct links; E-commerce and Produção hold
 * several and expand/collapse like an accordion.
 */
export const NAV_GROUPS: NavGroup[] = [
  { label: "Dashboard", href: "/admin", links: [] },
  {
    label: "E-commerce",
    links: [
      { href: "/admin/produtos", label: "Produtos" },
      { href: "/admin/estoque", label: "Estoque" },
      { href: "/admin/categorias", label: "Categorias" },
      { href: "/admin/cupons", label: "Cupons" },
      { href: "/admin/pedidos", label: "Pedidos" },
      { href: "/admin/vendas/nova", label: "Lançar venda" },
    ],
  },
  { label: "Encomendas", href: "/admin/encomendas", links: [] },
  {
    label: "Produção",
    links: [
      { href: "/admin/producao", label: "Produção" },
      { href: "/admin/materiais", label: "Materiais" },
      { href: "/admin/insumos", label: "Insumos" },
      { href: "/admin/precificacao", label: "Precificação" },
    ],
  },
  { label: "Financeiro", href: "/admin/financas", links: [] },
  { label: "Clientes", href: "/admin/clientes", links: [] },
  { label: "Configurações", href: "/admin/configuracoes", links: [] },
];

/** Flattened, in the same order — used by admin-mobile-nav and anywhere else that just needs every link. */
export const NAV_LINKS: NavLink[] = NAV_GROUPS.flatMap((group) =>
  group.links.length > 0 ? group.links : group.href ? [{ href: group.href, label: group.label }] : [],
);

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function isLinkActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

export function AdminNav() {
  const pathname = usePathname();
  const [openGroups, setOpenGroups] = useState<string[]>(() =>
    NAV_GROUPS.filter((g) => g.links.some((l) => isLinkActive(pathname, l.href))).map((g) => g.label),
  );

  useEffect(() => {
    setOpenGroups((prev) => {
      const activeGroup = NAV_GROUPS.find((g) => g.links.some((l) => isLinkActive(pathname, l.href)));
      if (!activeGroup || prev.includes(activeGroup.label)) return prev;
      return [...prev, activeGroup.label];
    });
  }, [pathname]);

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => (prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]));
  };

  return (
    <nav className="flex flex-col gap-1">
      {NAV_GROUPS.map((group) => {
        if (group.links.length === 0) {
          const active = isLinkActive(pathname, group.href!);
          return (
            <Link
              key={group.label}
              href={group.href!}
              className={`label-caps px-3 py-2.5 text-xs transition-colors ${
                active ? "bg-ink text-paper" : "text-graphite hover:bg-mist/60 hover:text-ink"
              }`}
            >
              {group.label}
            </Link>
          );
        }

        const open = openGroups.includes(group.label);
        const groupActive = group.links.some((l) => isLinkActive(pathname, l.href));

        return (
          <div key={group.label}>
            <button
              type="button"
              onClick={() => toggleGroup(group.label)}
              className={`label-caps flex w-full items-center justify-between px-3 py-2.5 text-xs transition-colors ${
                groupActive && !open ? "text-ink" : "text-graphite hover:text-ink"
              }`}
            >
              {group.label}
              <ChevronIcon open={open} />
            </button>
            {open && (
              <div className="ml-3 flex flex-col gap-1 border-l border-mist pl-3">
                {group.links.map((link) => {
                  const active = isLinkActive(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`label-caps px-3 py-2 text-xs transition-colors ${
                        active ? "bg-ink text-paper" : "text-graphite hover:bg-mist/60 hover:text-ink"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
