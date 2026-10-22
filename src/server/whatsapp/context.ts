import { db } from "../db";
import { createReviewUrl } from "../review-link";
import { isPurchase, phoneKey } from "@/lib/customer-insights";
import { SITE_URL } from "@/lib/site-config";
import type { MessageVars } from "@/lib/wa-cadence";
import type { Order } from "../types";

function brDate(date: Date) {
  return date.toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza", day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Dados do contato para as variáveis das mensagens ({{produto}}, {{pedido}}, {{link_orcamento}}...): procura pedidos e orçamentos
 * pelo telefone. O que não existir fica vazio (e a cadência não envia um texto que depende dele).
 */
export async function buildMessageVars(phone: string): Promise<MessageVars> {
  const key = phoneKey(phone);
  const [orders, quotes] = await Promise.all([
    db.order.findMany({
      where: { customerPhone: { not: null } },
      orderBy: { createdAt: "desc" },
      take: 400,
      select: { id: true, createdAt: true, status: true, channel: true, items: true, customerPhone: true, userEmail: true },
    }),
    db.quote.findMany({ orderBy: { createdAt: "desc" }, take: 200, select: { token: true, customerPhone: true } }),
  ]);

  const mine = orders.filter((o) => phoneKey(o.customerPhone) === key && isPurchase({ status: o.status as Order["status"], channel: o.channel as Order["channel"] }));
  const last = mine[0];
  const delivered = mine.find((o) => o.status === "Entregue");
  const quote = quotes.find((q) => phoneKey(q.customerPhone) === key);
  const firstItem = last && Array.isArray(last.items) ? (last.items as { name?: string }[])[0]?.name : undefined;

  return {
    ...(firstItem ? { produto: firstItem } : {}),
    ...(last ? { pedido: last.id, ultima_compra: brDate(last.createdAt) } : {}),
    ...(quote ? { link_orcamento: `${SITE_URL}/orcamento/${quote.token}` } : {}),
    ...(delivered ? { link_avaliacao: createReviewUrl({ id: delivered.id, userEmail: delivered.userEmail ?? undefined }) } : {}),
  };
}
