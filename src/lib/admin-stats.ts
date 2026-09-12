import { round2 } from "@/lib/money";
import type { Order, OrderStatus, PaymentMethod } from "@/server/types";

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

export type DayRevenue = { date: string; label: string; revenue: number };

/** One bucket per day for the last `days` days (oldest first), zero-filled where there's no order. */
export function revenueByDay(orders: Order[], days: number): DayRevenue[] {
  const today = startOfDay(new Date());
  const buckets: DayRevenue[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    buckets.push({
      date: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
      revenue: 0,
    });
  }
  const byDate = new Map(buckets.map((bucket) => [bucket.date, bucket]));
  for (const order of orders) {
    const bucket = byDate.get(order.createdAt.slice(0, 10));
    if (bucket) bucket.revenue = round2(bucket.revenue + order.total);
  }
  return buckets;
}

export type RevenueSplit = { confirmed: number; pending: number };

/**
 * "Confirmado" = pagamento já aprovado (ou etapa posterior de produção/envio);
 * "em aberto" = pedido recebido mas aguardando confirmação (Pix/boleto pendente,
 * ou venda manual ainda não fechada). Pedidos cancelados não entram em nenhum dos dois.
 */
export function revenueSplit(orders: Order[]): RevenueSplit {
  let confirmed = 0;
  let pending = 0;
  for (const order of orders) {
    if (order.status === "Cancelado") continue;
    if (order.status === "Pedido recebido") pending += order.total;
    else confirmed += order.total;
  }
  return { confirmed: round2(confirmed), pending: round2(pending) };
}

export type PeriodComparison = { current: number; previous: number; pct: number | null };

/** Revenue in the last `days` days vs. the `days` before that. `pct` is null when there's no baseline to compare against. */
export function periodComparison(orders: Order[], days: number): PeriodComparison {
  const today = startOfDay(new Date());
  const currentCutoff = new Date(today);
  currentCutoff.setDate(currentCutoff.getDate() - days);
  const previousCutoff = new Date(today);
  previousCutoff.setDate(previousCutoff.getDate() - days * 2);

  let current = 0;
  let previous = 0;
  for (const order of orders) {
    const createdAt = new Date(order.createdAt);
    if (createdAt >= currentCutoff) current += order.total;
    else if (createdAt >= previousCutoff) previous += order.total;
  }
  current = round2(current);
  previous = round2(previous);
  const pct = previous > 0 ? round2(((current - previous) / previous) * 100) : null;
  return { current, previous, pct };
}

export type TopProduct = { slug: string; name: string; categoryName: string; quantity: number; revenue: number };

export function topProducts(orders: Order[], limit = 5): TopProduct[] {
  const bySlug = new Map<string, TopProduct>();
  for (const order of orders) {
    for (const item of order.items) {
      const entry = bySlug.get(item.productSlug) ?? {
        slug: item.productSlug,
        name: item.name,
        categoryName: item.categoryName,
        quantity: 0,
        revenue: 0,
      };
      entry.quantity += item.quantity;
      entry.revenue = round2(entry.revenue + item.price * item.quantity);
      bySlug.set(item.productSlug, entry);
    }
  }
  return Array.from(bySlug.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  pix: "Pix",
  cartao: "Cartão",
  boleto: "Boleto",
};

export type PaymentBreakdown = { method: PaymentMethod; label: string; count: number; revenue: number };

export function paymentBreakdown(orders: Order[]): PaymentBreakdown[] {
  const totals: Record<PaymentMethod, { count: number; revenue: number }> = {
    pix: { count: 0, revenue: 0 },
    cartao: { count: 0, revenue: 0 },
    boleto: { count: 0, revenue: 0 },
  };
  for (const order of orders) {
    totals[order.paymentMethod].count += 1;
    totals[order.paymentMethod].revenue = round2(totals[order.paymentMethod].revenue + order.total);
  }
  return (Object.keys(totals) as PaymentMethod[]).map((method) => ({
    method,
    label: PAYMENT_LABELS[method],
    ...totals[method],
  }));
}

export type ChannelBreakdown = { channel: "site" | "manual"; label: string; count: number; revenue: number };

/** Site = checkout online; manual = presencial/whatsapp, lançado pelo admin em /admin/vendas/nova. */
export function channelBreakdown(orders: Order[]): ChannelBreakdown[] {
  const groups = { site: { count: 0, revenue: 0 }, manual: { count: 0, revenue: 0 } };
  for (const order of orders) {
    const key = order.channel === "online" ? "site" : "manual";
    groups[key].count += 1;
    groups[key].revenue = round2(groups[key].revenue + order.total);
  }
  return [
    { channel: "site", label: "Vendas no site", ...groups.site },
    { channel: "manual", label: "Lançadas manualmente", ...groups.manual },
  ];
}

export type StatusBreakdown = { status: OrderStatus; count: number };

export function statusBreakdown(orders: Order[]): StatusBreakdown[] {
  const counts = new Map<OrderStatus, number>();
  for (const order of orders) counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}
