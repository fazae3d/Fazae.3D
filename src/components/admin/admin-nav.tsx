"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminIcon, type AdminIconName } from "./admin-icons";

export type NavLink = { href: string; label: string };
export type NavGroup = {
  key: string;
  label: string;
  icon: AdminIconName;
  /** Para onde o item do menu leva. */
  href: string;
  /** Telas do mesmo assunto: aparecem como abas no topo da página (só quando há mais de uma). */
  links: NavLink[];
  /** Prefixos de rota que também pertencem ao grupo (telas sem aba própria, como o lançamento de venda). */
  extraMatch?: string[];
};

/**
 * Menu enxuto: 8 áreas do negócio. Telas relacionadas viram abas dentro da área (ver SectionTabs),
 * em vez de 20 links soltos no menu.
 */
export const NAV_GROUPS: NavGroup[] = [
  { key: "visao-geral", label: "Visão geral", icon: "dashboard", href: "/admin", links: [] },
  {
    key: "pedidos",
    label: "Pedidos",
    icon: "orders",
    href: "/admin/pedidos",
    links: [
      { href: "/admin/pedidos", label: "Pedidos" },
      { href: "/admin/encomendas", label: "Encomendas" },
      { href: "/admin/carrinhos", label: "Carrinhos abandonados" },
      { href: "/admin/consignacao", label: "Consignação" },
    ],
    extraMatch: ["/admin/vendas"],
  },
  { key: "orcamentos", label: "Orçamentos", icon: "quotes", href: "/admin/orcamentos", links: [] },
  {
    key: "catalogo",
    label: "Catálogo",
    icon: "catalog",
    href: "/admin/produtos",
    links: [
      { href: "/admin/produtos", label: "Produtos" },
      { href: "/admin/estoque", label: "Estoque" },
      { href: "/admin/categorias", label: "Categorias" },
      { href: "/admin/cupons", label: "Cupons" },
      { href: "/admin/avaliacoes", label: "Avaliações" },
    ],
  },
  {
    key: "producao",
    label: "Produção",
    icon: "production",
    href: "/admin/producao",
    links: [
      { href: "/admin/producao", label: "Fila de produção" },
      { href: "/admin/precificacao", label: "Precificação" },
      { href: "/admin/materiais", label: "Materiais" },
      { href: "/admin/insumos", label: "Insumos" },
    ],
  },
  { key: "clientes", label: "Clientes", icon: "clients", href: "/admin/clientes", links: [] },
  {
    key: "financas",
    label: "Finanças",
    icon: "finance",
    href: "/admin/financas",
    links: [
      { href: "/admin/financas", label: "Resultado e gastos" },
      { href: "/admin/lucratividade", label: "Lucro por produto" },
    ],
  },
  {
    key: "configuracoes",
    label: "Configurações",
    icon: "settings",
    href: "/admin/configuracoes",
    links: [
      { href: "/admin/configuracoes", label: "Loja" },
      { href: "/admin/atividade", label: "Atividade" },
    ],
  },
];

/** Todos os destinos, na ordem do menu — usado pela busca (Ctrl+K). */
export const NAV_LINKS: NavLink[] = NAV_GROUPS.flatMap((group) =>
  group.links.length > 0 ? group.links : [{ href: group.href, label: group.label }],
);

export function isLinkActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function activeGroupFor(pathname: string): NavGroup | undefined {
  return NAV_GROUPS.find(
    (g) =>
      isLinkActive(pathname, g.href) ||
      g.links.some((l) => isLinkActive(pathname, l.href)) ||
      g.extraMatch?.some((prefix) => isLinkActive(pathname, prefix)),
  );
}

function NavItem({ group, active, badge, onNavigate }: { group: NavGroup; active: boolean; badge?: number; onNavigate?: () => void }) {
  return (
    <Link
      href={group.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={`group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
        active ? "admin-nav-active" : "text-graphite hover:bg-mist/60 hover:text-ink"
      }`}
    >
      <AdminIcon name={group.icon} />
      <span className="flex-1">{group.label}</span>
      {badge ? (
        <span className="rounded-full bg-petrol px-1.5 py-px text-[11px] font-semibold leading-4 text-[#111]">{badge}</span>
      ) : null}
    </Link>
  );
}

export function AdminNav({ badges = {}, onNavigate }: { badges?: Record<string, number>; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = activeGroupFor(pathname);
  return (
    <nav className="flex flex-col gap-1" aria-label="Menu administrativo">
      {NAV_GROUPS.map((group) => (
        <NavItem key={group.key} group={group} active={active?.key === group.key} badge={badges[group.key]} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

/** Abas da área atual (ex.: Pedidos · Encomendas · Carrinhos). Some quando a área tem uma tela só. */
export function SectionTabs() {
  const pathname = usePathname();
  const group = activeGroupFor(pathname);
  if (!group || group.links.length < 2) return null;
  // Em telas sem aba própria (ex.: /admin/vendas/nova) nenhuma aba fica marcada, e tudo bem.
  return (
    <div className="mb-6 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-mist [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={group.label}>
      {group.links.map((link) => {
        const active = isLinkActive(pathname, link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            role="tab"
            aria-selected={active}
            className={`whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors ${
              active ? "admin-tab-active" : "border-transparent text-graphite hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
