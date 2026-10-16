import { round2 } from "@/lib/money";
import { storeDayKey, toStoreTime } from "@/lib/store-time";

export type QuoteStatus = "rascunho" | "enviado" | "aprovado" | "recusado";
/** O que o painel mostra: "vencido" não é gravado, vem da validade. */
export type QuoteDisplayStatus = QuoteStatus | "vencido";

export type QuoteItem = {
  description: string;
  /** Detalhes que saem em cinza embaixo da descrição (material, cor, medidas...). */
  details?: string;
  quantity: number;
  unitPrice: number;
  /** Quando o item veio do catálogo; vazio = item livre. */
  productSlug?: string;
};

export type Quote = {
  id: string;
  number: number;
  token: string;
  status: QuoteStatus;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerDocument?: string;
  customerAddress?: string;
  title?: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  validUntil: string;
  deliveryTime?: string;
  paymentTerms?: string;
  notes?: string;
  sentAt?: string;
  decidedAt?: string;
  lastFollowUpAt?: string;
  linkedRequestId?: string;
  linkedOrderId?: string;
  createdAt: string;
  updatedAt: string;
};

export const QUOTE_STATUS_LABELS: Record<QuoteDisplayStatus, string> = {
  rascunho: "Rascunho",
  enviado: "Enviado",
  aprovado: "Aprovado",
  recusado: "Recusado",
  vencido: "Vencido",
};

export const DEFAULT_QUOTE_VALIDITY_DAYS = 7;
export const DEFAULT_QUOTE_DELIVERY = "7 a 10 dias úteis após a confirmação do pagamento.";
export const DEFAULT_QUOTE_PAYMENT =
  "Pix ou cartão de crédito. Para iniciar a produção pedimos 50% de sinal; o restante é pago antes do envio ou da retirada.";
export const DEFAULT_QUOTE_NOTES =
  "Peças impressas em 3D: pequenas variações de textura e tonalidade são características do processo. Cores e modelo são confirmados com você antes de produzir.";

/** "ORC-0007" */
export function quoteNumberLabel(number: number) {
  return `ORC-${String(number).padStart(4, "0")}`;
}

export function computeQuoteTotals(items: Pick<QuoteItem, "quantity" | "unitPrice">[], discount: number, shipping: number) {
  const subtotal = round2(items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0));
  const safeDiscount = Math.min(Math.max(round2(discount), 0), subtotal);
  const safeShipping = Math.max(round2(shipping), 0);
  return { subtotal, discount: safeDiscount, shipping: safeShipping, total: round2(subtotal - safeDiscount + safeShipping) };
}

/** Fim do dia (fuso da loja) de "YYYY-MM-DD" — o orçamento vale até as 23h59 desse dia. */
export function validityEndOfDay(day: string) {
  return new Date(`${day}T23:59:59-03:00`);
}

/** "YYYY-MM-DD" daqui a `days` dias (fuso da loja). */
export function validityFromNow(days: number, now = new Date()) {
  return storeDayKey(new Date(now.getTime() + days * 86_400_000));
}

export function isQuoteExpired(quote: Pick<Quote, "status" | "validUntil">, now = new Date()) {
  return (quote.status === "rascunho" || quote.status === "enviado") && new Date(quote.validUntil).getTime() < now.getTime();
}

export function quoteDisplayStatus(quote: Pick<Quote, "status" | "validUntil">, now = new Date()): QuoteDisplayStatus {
  return isQuoteExpired(quote, now) ? "vencido" : quote.status;
}

/** Dias sem resposta depois dos quais vale chamar o cliente de novo. */
export const QUOTE_FOLLOW_UP_DAYS = 3;

/**
 * Orçamento enviado e ainda dentro da validade que ficou sem resposta por 3 dias ou mais (contando do envio ou do último contato).
 * Quando faltam 2 dias ou menos para vencer, entra na lista mesmo antes disso.
 */
export function needsFollowUp(
  quote: Pick<Quote, "status" | "validUntil" | "sentAt" | "lastFollowUpAt">,
  now = new Date(),
) {
  if (quote.status !== "enviado" || isQuoteExpired(quote, now)) return false;
  const reference = quote.lastFollowUpAt ?? quote.sentAt;
  if (!reference) return false;
  const quietDays = Math.floor((now.getTime() - new Date(reference).getTime()) / 86_400_000);
  const expiresSoon = daysUntil(quote.validUntil, now) <= 2;
  return quietDays >= QUOTE_FOLLOW_UP_DAYS || (expiresSoon && quietDays >= 1);
}

/** "15/10/2026" no fuso da loja. */
export function formatStoreDate(iso: string | Date) {
  const d = toStoreTime(typeof iso === "string" ? new Date(iso) : iso);
  return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
}

/** Quantos dias faltam (negativo = já venceu), contando pelo dia local da loja. */
export function daysUntil(iso: string, now = new Date()) {
  const a = Math.floor(toStoreTime(new Date(iso)).getTime() / 86_400_000);
  const b = Math.floor(toStoreTime(now).getTime() / 86_400_000);
  return a - b;
}
