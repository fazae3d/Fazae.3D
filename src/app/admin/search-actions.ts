"use server";

import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { formatPrice } from "@/lib/format";
import { quoteNumberLabel } from "@/lib/quote";
import { db } from "@/server/db";

export type AdminSearchHit = { group: "Pedidos" | "Orçamentos" | "Clientes" | "Produtos"; title: string; subtitle?: string; href: string };

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

/** Busca global do painel (Ctrl+K): pedidos, orçamentos, clientes e produtos. Nunca lança: falha vira lista vazia. */
export async function adminSearchAction(rawQuery: string): Promise<AdminSearchHit[]> {
  if (!(await requireAdmin())) return [];
  const q = rawQuery.trim().slice(0, 60);
  if (q.length < 2) return [];
  const contains = { contains: q, mode: "insensitive" as const };
  const digits = q.replace(/\D/g, "");

  try {
    const [orders, quotes, customers, products] = await Promise.all([
      db.order.findMany({
        where: { OR: [{ id: contains }, { customerName: contains }, { userEmail: contains }, ...(digits.length >= 4 ? [{ customerPhone: { contains: digits } }] : [])] },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, customerName: true, userEmail: true, total: true },
      }),
      db.quote.findMany({
        where: { OR: [{ customerName: contains }, { title: contains }, ...(digits ? [{ number: Number(digits) }] : [])] },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, number: true, customerName: true, total: true },
      }),
      db.customer.findMany({
        where: { OR: [{ name: contains }, { email: contains }, ...(digits.length >= 4 ? [{ phone: { contains: digits } }] : [])] },
        take: 5,
        select: { id: true, name: true, phone: true },
      }),
      db.product.findMany({
        where: { OR: [{ name: contains }, { slug: contains }] },
        take: 5,
        select: { slug: true, name: true, price: true },
      }),
    ]);

    return [
      ...orders.map((o) => ({
        group: "Pedidos" as const,
        title: `Pedido ${o.id}`,
        subtitle: `${o.customerName ?? o.userEmail ?? "Cliente"} · ${formatPrice(o.total)}`,
        href: `/admin/pedidos?q=${encodeURIComponent(o.id)}`,
      })),
      ...quotes.map((x) => ({
        group: "Orçamentos" as const,
        title: `${quoteNumberLabel(x.number)} · ${x.customerName}`,
        subtitle: formatPrice(x.total),
        href: `/admin/orcamentos/${x.id}`,
      })),
      ...customers.map((c) => ({ group: "Clientes" as const, title: c.name, subtitle: c.phone, href: `/admin/clientes?q=${encodeURIComponent(c.phone)}` })),
      ...products.map((p) => ({
        group: "Produtos" as const,
        title: p.name,
        subtitle: p.price != null ? formatPrice(p.price) : "Sob consulta",
        href: `/admin/produtos?q=${encodeURIComponent(p.name)}`,
      })),
    ];
  } catch (error) {
    console.error("[busca do painel] falhou", error);
    return [];
  }
}
