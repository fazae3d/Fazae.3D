import { db } from "../db";
import type { Prisma } from "@/generated/prisma/client";
import type { Quote, QuoteItem, QuoteStatus } from "@/lib/quote";

type Row = Prisma.QuoteGetPayload<object>;

function toQuote(row: Row): Quote {
  return {
    id: row.id,
    number: row.number,
    token: row.token,
    status: row.status as QuoteStatus,
    customerName: row.customerName,
    customerPhone: row.customerPhone ?? undefined,
    customerEmail: row.customerEmail ?? undefined,
    customerDocument: row.customerDocument ?? undefined,
    customerAddress: row.customerAddress ?? undefined,
    title: row.title ?? undefined,
    items: row.items as unknown as QuoteItem[],
    subtotal: row.subtotal,
    discount: row.discount,
    shipping: row.shipping,
    freeShipping: row.freeShipping,
    shippingOriginal: row.shippingOriginal,
    total: row.total,
    validUntil: row.validUntil.toISOString(),
    deliveryTime: row.deliveryTime ?? undefined,
    paymentTerms: row.paymentTerms ?? undefined,
    notes: row.notes ?? undefined,
    sentAt: row.sentAt?.toISOString(),
    decidedAt: row.decidedAt?.toISOString(),
    lastFollowUpAt: row.lastFollowUpAt?.toISOString(),
    lostReason: row.lostReason ?? undefined,
    lostNote: row.lostNote ?? undefined,
    pixDepositPct: row.pixDepositPct ?? undefined,
    paymentMethod: row.paymentMethod === "cartao" ? "cartao" : row.paymentMethod === "pix" ? "pix" : undefined,
    cardSurcharge: row.cardSurcharge ?? undefined,
    cardInstallments: row.cardInstallments ?? undefined,
    linkedRequestId: row.linkedRequestId ?? undefined,
    linkedOrderId: row.linkedOrderId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export type QuoteInput = {
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
  freeShipping: boolean;
  shippingOriginal: number;
  total: number;
  validUntil: Date;
  deliveryTime?: string;
  paymentTerms?: string;
  notes?: string;
  pixDepositPct?: number;
  paymentMethod?: string;
  cardSurcharge?: number;
  cardInstallments?: number;
  linkedRequestId?: string;
};

export async function getAllQuotes(): Promise<Quote[]> {
  const rows = await db.quote.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toQuote);
}

export async function getQuote(id: string): Promise<Quote | undefined> {
  const row = await db.quote.findUnique({ where: { id } });
  return row ? toQuote(row) : undefined;
}

export async function getQuoteByToken(token: string): Promise<Quote | undefined> {
  if (!token) return undefined;
  const row = await db.quote.findUnique({ where: { token } });
  return row ? toQuote(row) : undefined;
}

function toData(input: QuoteInput) {
  return { ...input, items: input.items as unknown as Prisma.InputJsonValue };
}

export async function createQuote(input: QuoteInput): Promise<Quote> {
  return toQuote(await db.quote.create({ data: toData(input) }));
}

export async function updateQuote(id: string, input: QuoteInput): Promise<Quote | null> {
  const existing = await db.quote.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  return toQuote(await db.quote.update({ where: { id }, data: toData(input) }));
}

export type QuoteLoss = { reason?: string; note?: string };

/** Muda a situação do orçamento. O motivo da perda só vale para "recusado"; em qualquer outra situação ele é limpo. */
export async function setQuoteStatus(id: string, status: QuoteStatus, loss?: QuoteLoss): Promise<Quote | null> {
  const existing = await db.quote.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return null;
  const now = new Date();
  return toQuote(
    await db.quote.update({
      where: { id },
      data: {
        status,
        sentAt: status === "enviado" ? now : undefined,
        decidedAt: status === "aprovado" || status === "recusado" ? now : null,
        lostReason: status === "recusado" ? (loss?.reason ?? null) : null,
        lostNote: status === "recusado" ? (loss?.note?.trim() ? loss.note.trim() : null) : null,
      },
    }),
  );
}

export async function linkQuoteToOrder(id: string, orderId: string): Promise<void> {
  await db.quote.update({ where: { id }, data: { linkedOrderId: orderId, status: "aprovado", decidedAt: new Date(), lostReason: null, lostNote: null } });
}

export async function deleteQuote(id: string): Promise<void> {
  await db.quote.deleteMany({ where: { id } });
}

export async function markQuoteFollowedUp(id: string): Promise<void> {
  await db.quote.update({ where: { id }, data: { lastFollowUpAt: new Date() } });
}
