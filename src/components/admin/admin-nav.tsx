"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/estoque", label: "Estoque" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/materiais", label: "Materiais" },
  { href: "/admin/insumos", label: "Insumos" },
  { href: "/admin/precificacao", label: "Precificação" },
  { href: "/admin/encomendas", label: "Encomendas" },
  { href: "/admin/producao", label: "Produção" },
  { href: "/admin/cupons", label: "Cupons" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/vendas/nova", label: "Lançar venda" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_LINKS.map((link) => {
        const active = link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`label-caps px-3 py-2.5 text-xs transition-colors ${
              active ? "bg-ink text-paper" : "text-graphite hover:bg-mist/60 hover:text-ink"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
