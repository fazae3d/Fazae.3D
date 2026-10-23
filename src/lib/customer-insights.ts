import { round2 } from "@/lib/money";
import type { Customer, Order } from "@/server/types";

/** Padrões (Regras da loja, no painel, sobrescrevem): cliente que não compra há tantos dias entra na lista de reativação. */
export const REACTIVATION_DAYS = 120;
/** Depois de um lembrete, o cliente some da lista por este tempo (para não insistir). */
export const REMINDER_COOLDOWN_DAYS = 30;

const DAY_MS = 86_400_000;

/** Chave para comparar telefones escritos de formas diferentes: "(84) 99999-8888" e "5584999998888" dão a mesma. */
export function phoneKey(phone?: string | null) {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length >= 12 && digits.startsWith("55")) digits = digits.slice(2);
  // Celular antigo sem o nono dígito (DDD + 8 números começando em 6 a 9) vira a forma com 9, igual ao WhatsApp atual.
  if (digits.length === 10 && /^[6-9]/.test(digits.slice(2))) digits = `${digits.slice(0, 2)}9${digits.slice(2)}`;
  return digits;
}

/** Compra de verdade: não cancelada e, no site, já paga (pedido online só "recebido" ainda não foi pago). */
export function isPurchase(order: Pick<Order, "status" | "channel">) {
  if (order.status === "Cancelado") return false;
  return order.channel !== "online" || order.status !== "Pedido recebido";
}

export type CustomerMetrics = {
  orderCount: number;
  totalSpent: number;
  averageTicket: number;
  lastOrderAt?: string;
  firstOrderAt?: string;
};

const EMPTY: CustomerMetrics = { orderCount: 0, totalSpent: 0, averageTicket: 0 };

/** Junta os pedidos de cada cliente pelo telefone (e, se o pedido não tiver telefone, pelo e-mail). */
export function buildCustomerMetrics(
  customers: Pick<Customer, "id" | "phone" | "email">[],
  orders: Pick<Order, "status" | "channel" | "total" | "createdAt" | "customerPhone" | "userEmail">[],
): Map<string, CustomerMetrics> {
  const byPhone = new Map<string, string>();
  const byEmail = new Map<string, string>();
  for (const c of customers) {
    const key = phoneKey(c.phone);
    if (key) byPhone.set(key, c.id);
    if (c.email) byEmail.set(c.email.trim().toLowerCase(), c.id);
  }

  const acc = new Map<string, { count: number; total: number; first: string; last: string }>();
  for (const order of orders) {
    if (!isPurchase(order)) continue;
    const id = (order.customerPhone && byPhone.get(phoneKey(order.customerPhone))) || (order.userEmail && byEmail.get(order.userEmail.trim().toLowerCase())) || undefined;
    if (!id) continue;
    const entry = acc.get(id) ?? { count: 0, total: 0, first: order.createdAt, last: order.createdAt };
    entry.count += 1;
    entry.total += order.total;
    if (order.createdAt < entry.first) entry.first = order.createdAt;
    if (order.createdAt > entry.last) entry.last = order.createdAt;
    acc.set(id, entry);
  }

  const result = new Map<string, CustomerMetrics>();
  for (const c of customers) {
    const e = acc.get(c.id);
    result.set(
      c.id,
      e
        ? { orderCount: e.count, totalSpent: round2(e.total), averageTicket: round2(e.total / e.count), firstOrderAt: e.first, lastOrderAt: e.last }
        : EMPTY,
    );
  }
  return result;
}

export function daysSince(iso: string, now = new Date()) {
  return Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS);
}

/** Já comprou e está parado há `days` dias ou mais (cliente que nunca comprou é lead, não entra). */
export function isInactive(metrics: CustomerMetrics, now = new Date(), days = REACTIVATION_DAYS) {
  return metrics.orderCount > 0 && metrics.lastOrderAt !== undefined && daysSince(metrics.lastOrderAt, now) >= days;
}

/** Foi lembrado há pouco? Então fica fora da lista até acabar o intervalo. */
export function wasRecentlyReminded(lastReminderAt: string | undefined, now = new Date(), cooldownDays = REMINDER_COOLDOWN_DAYS) {
  return lastReminderAt !== undefined && daysSince(lastReminderAt, now) < cooldownDays;
}

export type RankedCustomer<T> = T & { metrics: CustomerMetrics };

/** Melhores clientes: por valor gasto ou por número de compras (o outro critério desempata). */
export function rankCustomers<T extends { id: string }>(
  customers: T[],
  metrics: Map<string, CustomerMetrics>,
  by: "valor" | "quantidade",
): RankedCustomer<T>[] {
  return customers
    .map((c) => ({ ...c, metrics: metrics.get(c.id) ?? EMPTY }))
    .filter((c) => c.metrics.orderCount > 0)
    .sort((a, b) =>
      by === "valor"
        ? b.metrics.totalSpent - a.metrics.totalSpent || b.metrics.orderCount - a.metrics.orderCount
        : b.metrics.orderCount - a.metrics.orderCount || b.metrics.totalSpent - a.metrics.totalSpent,
    );
}

/** Mensagem pronta de WhatsApp para chamar o cliente de volta. */
export function reactivationMessage({ name, lastOrderAt, siteUrl, coupon }: { name: string; lastOrderAt?: string; siteUrl: string; coupon?: string }) {
  const first = name.trim().split(/\s+/)[0] || "tudo bem";
  const lastDate = lastOrderAt ? new Date(lastOrderAt).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" }) : null;
  const parts = [
    `Oi, ${first}! Aqui é da Fazaê 3D.`,
    lastDate ? `Faz um tempinho desde o seu último pedido (${lastDate}) e a gente sentiu sua falta!` : "Faz um tempinho que a gente não se fala!",
    `Chegaram novidades na loja: ${siteUrl}/loja`,
    coupon?.trim() ? `Para a sua volta, use o cupom ${coupon.trim().toUpperCase()} no checkout.` : "",
    "Posso te ajudar com alguma peça?",
  ];
  return parts.filter(Boolean).join(" ");
}
