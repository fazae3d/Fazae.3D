import { round2 } from "@/lib/money";
import { storeDayKey, storeDayNumber } from "@/lib/store-time";
import { CHANNEL_LABELS } from "@/lib/channels";
import type { Order, OrderStatus, PaymentMethod, SaleChannel } from "@/server/types";

/** Pedido cancelado não é venda: fora de faturamento, ticket médio, gráficos e rankings. */
export function isActiveOrder(order: Order) {
  return order.status !== "Cancelado";
}

/**
 * Quanto ainda falta receber de um pedido. Pedido online já aprovado no Mercado Pago está pago por inteiro
 * (o sinal só existe nas vendas/encomendas lançadas à mão); cancelado não tem nada a receber.
 */
export function orderBalanceDue(order: Order) {
  if (order.status === "Cancelado") return 0;
  if (order.paymentStatus === "approved") return 0;
  return Math.max(0, round2(order.total - (order.depositAmount ?? 0)));
}

export type DayRevenue = { date: string; label: string; revenue: number };

/** One bucket per day for the last `days` days (oldest first), zero-filled where there's no order. Dias no fuso da loja. */
export function revenueByDay(orders: Order[], days: number): DayRevenue[] {
  const todayNumber = storeDayNumber(new Date());
  const buckets: DayRevenue[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date((todayNumber - i) * 86_400_000);
    const iso = date.toISOString().slice(0, 10);
    buckets.push({ date: iso, label: `${iso.slice(8, 10)}/${iso.slice(5, 7)}`, revenue: 0 });
  }
  const byDate = new Map(buckets.map((bucket) => [bucket.date, bucket]));
  for (const order of orders) {
    if (!isActiveOrder(order)) continue;
    const bucket = byDate.get(storeDayKey(new Date(order.createdAt)));
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
  const todayNumber = storeDayNumber(new Date());
  let current = 0;
  let previous = 0;
  for (const order of orders) {
    if (!isActiveOrder(order)) continue;
    const age = todayNumber - storeDayNumber(new Date(order.createdAt));
    if (age < 0) continue;
    if (age < days) current += order.total;
    else if (age < days * 2) previous += order.total;
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
    if (!isActiveOrder(order)) continue;
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
    if (!isActiveOrder(order)) continue;
    totals[order.paymentMethod].count += 1;
    totals[order.paymentMethod].revenue = round2(totals[order.paymentMethod].revenue + order.total);
  }
  return (Object.keys(totals) as PaymentMethod[]).map((method) => ({
    method,
    label: PAYMENT_LABELS[method],
    ...totals[method],
  }));
}

export type ChannelBreakdown = { channel: SaleChannel; label: string; count: number; revenue: number };

/** Vendas por canal (site, presencial, WhatsApp e marketplaces); só aparecem os canais que já tiveram venda, do maior para o menor. */
export function channelBreakdown(orders: Order[]): ChannelBreakdown[] {
  const groups = new Map<SaleChannel, { count: number; revenue: number }>();
  for (const order of orders) {
    if (!isActiveOrder(order)) continue;
    const g = groups.get(order.channel) ?? { count: 0, revenue: 0 };
    g.count += 1;
    g.revenue = round2(g.revenue + order.total);
    groups.set(order.channel, g);
  }
  return Array.from(groups.entries())
    .map(([channel, g]) => ({ channel, label: CHANNEL_LABELS[channel], ...g }))
    .sort((a, b) => b.revenue - a.revenue);
}

export type StatusBreakdown = { status: OrderStatus; count: number };

export function statusBreakdown(orders: Order[]): StatusBreakdown[] {
  const counts = new Map<OrderStatus, number>();
  for (const order of orders) counts.set(order.status, (counts.get(order.status) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);
}
