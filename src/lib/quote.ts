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
  /** Frete grátis para o cliente (shipping = 0) com o valor normal em shippingOriginal, mostrado riscado. */
  freeShipping: boolean;
  shippingOriginal: number;
  total: number;
  validUntil: string;
  deliveryTime?: string;
  paymentTerms?: string;
  notes?: string;
  sentAt?: string;
  decidedAt?: string;
  lastFollowUpAt?: string;
  /** Por que o orçamento foi perdido (chave de QUOTE_LOSS_REASONS) e uma observação livre. */
  lostReason?: string;
  lostNote?: string;
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

/** Motivos de perda de um orçamento (o que o dono escolhe ao marcar "cliente recusou"). */
export const QUOTE_LOSS_REASONS: { value: string; label: string }[] = [
  { value: "preco", label: "Preço alto" },
  { value: "prazo", label: "Prazo de entrega" },
  { value: "concorrente", label: "Fechou com outro fornecedor" },
  { value: "sem_resposta", label: "Parou de responder" },
  { value: "adiou", label: "Vai decidir mais tarde" },
  { value: "desistiu", label: "Desistiu do projeto" },
  { value: "outro", label: "Outro motivo" },
];

export function quoteLossLabel(reason?: string) {
  return QUOTE_LOSS_REASONS.find((r) => r.value === reason)?.label ?? "Motivo não informado";
}

/** Padrões de um orçamento novo; as Regras da loja (painel) sobrescrevem. */
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

export type QuoteSavings = {
  discount: number;
  /** Desconto em % sobre os itens (arredondado). */
  discountPct: number;
  freeShipping: boolean;
  /** Quanto o frete grátis economiza (valor normal do frete); 0 se não foi informado. */
  shippingSaved: number;
  /** Soma de tudo que o cliente deixa de pagar. */
  total: number;
  /** Quanto custaria sem nenhum benefício: itens + frete normal. */
  fullPrice: number;
};

/** O que o cliente ganha neste orçamento (desconto e frete grátis): usado para evidenciar a economia. */
export function quoteSavings(quote: Pick<Quote, "subtotal" | "discount" | "freeShipping" | "shippingOriginal" | "shipping">): QuoteSavings {
  const shippingSaved = quote.freeShipping ? Math.max(0, quote.shippingOriginal) : 0;
  const discountPct = quote.subtotal > 0 ? Math.round((quote.discount / quote.subtotal) * 100) : 0;
  return {
    discount: quote.discount,
    discountPct,
    freeShipping: quote.freeShipping,
    shippingSaved,
    total: round2(quote.discount + shippingSaved),
    fullPrice: round2(quote.subtotal + (quote.freeShipping ? shippingSaved : quote.shipping)),
  };
}

/** Fim do dia (fuso da loja) de "YYYY-MM-DD", o orçamento vale até as 23h59 desse dia. */
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

/** Texto do orçamento para WhatsApp: valor, o que o cliente ganha (desconto/frete grátis), validade e o link. */
export function quoteWhatsAppMessage(input: {
  customerName: string;
  number: number;
  total: number;
  savings?: number;
  freeShipping?: boolean;
  validUntil: string;
  link: string;
}) {
  const first = input.customerName.trim().split(/\s+/)[0] || input.customerName;
  const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const win =
    input.savings && input.savings > 0
      ? ` Você está economizando ${brl(input.savings)}${input.freeShipping ? " e ainda ganha frete grátis" : ""}!`
      : input.freeShipping
        ? " E o frete é grátis!"
        : "";
  return `Olá, ${first}! Segue o orçamento ${quoteNumberLabel(input.number)} da Fazaê 3D, no valor de ${brl(input.total)}.${win} A condição vale até ${formatStoreDate(input.validUntil)}:\n${input.link}`;
}
