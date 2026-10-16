"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { quoteFormSchema, type QuoteFormInput } from "@/lib/admin-validation";
import { withMutationFallback } from "@/lib/db-fallback";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getEmailContactUrl, renderEmailLayout } from "@/lib/email-template";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";
import { computeQuoteTotals, formatStoreDate, quoteNumberLabel, validityEndOfDay, type Quote, type QuoteStatus } from "@/lib/quote";
import { SITE_URL } from "@/lib/site-config";
import { logAdminAction } from "@/server/audit";
import {
  createQuote,
  deleteQuote,
  getQuote,
  linkQuoteToOrder,
  markQuoteFollowedUp,
  setQuoteStatus,
  updateQuote,
  type QuoteInput,
} from "@/server/repositories/quote-repository";
import { addOrder, generateOrderId } from "@/server/repositories/order-repository";
import { getProduct } from "@/server/repositories/product-repository";
import { updateCustomOrderRequest } from "@/server/repositories/custom-order-request-repository";
import type { Order, OrderItem } from "@/server/types";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

const DENIED = { success: false, error: "Acesso restrito ao administrador." } as const;

type SaveResult = { success: true; id: string } | { success: false; error: string };
type SimpleResult = { success: true } | { success: false; error: string };

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function buildInput(data: QuoteFormInput): QuoteInput {
  const items = data.items.map((item) => ({
    description: item.description.trim(),
    details: clean(item.details),
    quantity: item.quantity,
    unitPrice: round2(item.unitPrice),
    productSlug: clean(item.productSlug),
  }));
  const totals = computeQuoteTotals(items, data.discount, data.shipping);
  return {
    customerName: data.customerName.trim(),
    customerPhone: clean(data.customerPhone),
    customerEmail: clean(data.customerEmail),
    customerDocument: clean(data.customerDocument),
    customerAddress: clean(data.customerAddress),
    title: clean(data.title),
    items,
    ...totals,
    validUntil: validityEndOfDay(data.validUntil),
    deliveryTime: clean(data.deliveryTime),
    paymentTerms: clean(data.paymentTerms),
    notes: clean(data.notes),
    linkedRequestId: clean(data.linkedRequestId),
  };
}

function revalidateQuotes(id?: string) {
  revalidatePath("/admin/orcamentos");
  if (id) revalidatePath(`/admin/orcamentos/${id}`);
  revalidatePath("/admin");
}

export async function saveQuoteAction(id: string | null, input: QuoteFormInput): Promise<SaveResult> {
  if (!(await requireAdmin())) return DENIED;
  const parsed = quoteFormSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };

  return withMutationFallback(async (): Promise<SaveResult> => {
    const data = buildInput(parsed.data);
    if (id) {
      const updated = await updateQuote(id, data);
      if (!updated) return { success: false, error: "Orçamento não encontrado." };
      await logAdminAction("orcamento.editar", "Quote", id, { number: updated.number, total: updated.total });
      revalidateQuotes(id);
      return { success: true, id };
    }
    const created = await createQuote(data);
    // O lead de encomenda que originou o orçamento passa para "orçamento enviado" sozinho.
    if (data.linkedRequestId) {
      await updateCustomOrderRequest(data.linkedRequestId, { status: "orcamento_enviado" }).catch(() => null);
      revalidatePath("/admin/encomendas");
    }
    await logAdminAction("orcamento.criar", "Quote", created.id, { number: created.number, total: created.total });
    revalidateQuotes();
    return { success: true, id: created.id };
  });
}

export async function setQuoteStatusAction(id: string, status: QuoteStatus): Promise<SimpleResult> {
  if (!(await requireAdmin())) return DENIED;
  return withMutationFallback(async (): Promise<SimpleResult> => {
    const updated = await setQuoteStatus(id, status);
    if (!updated) return { success: false, error: "Orçamento não encontrado." };
    await logAdminAction("orcamento.status", "Quote", id, { number: updated.number, status });
    revalidateQuotes(id);
    return { success: true };
  });
}

export async function deleteQuoteAction(id: string): Promise<SimpleResult> {
  if (!(await requireAdmin())) return DENIED;
  return withMutationFallback(async (): Promise<SimpleResult> => {
    const existing = await getQuote(id);
    await deleteQuote(id);
    await logAdminAction("orcamento.excluir", "Quote", id, { number: existing?.number });
    revalidateQuotes();
    return { success: true };
  });
}

/** Cria uma cópia em rascunho (mesmos itens e condições, validade renovada): serve para o mesmo cliente ou para pedidos parecidos. */
export async function duplicateQuoteAction(id: string, validUntil: string): Promise<SaveResult> {
  if (!(await requireAdmin())) return DENIED;
  return withMutationFallback(async (): Promise<SaveResult> => {
    const original = await getQuote(id);
    if (!original) return { success: false, error: "Orçamento não encontrado." };
    const created = await createQuote({
      customerName: original.customerName,
      customerPhone: original.customerPhone,
      customerEmail: original.customerEmail,
      customerDocument: original.customerDocument,
      customerAddress: original.customerAddress,
      title: original.title,
      items: original.items,
      subtotal: original.subtotal,
      discount: original.discount,
      shipping: original.shipping,
      total: original.total,
      validUntil: validityEndOfDay(validUntil),
      deliveryTime: original.deliveryTime,
      paymentTerms: original.paymentTerms,
      notes: original.notes,
    });
    await logAdminAction("orcamento.duplicar", "Quote", created.id, { from: original.number, number: created.number });
    revalidateQuotes();
    return { success: true, id: created.id };
  });
}

/** Marca como enviado (usado ao abrir o WhatsApp com o link); só mexe em rascunhos. */
export async function markQuoteSentAction(id: string): Promise<SimpleResult> {
  if (!(await requireAdmin())) return DENIED;
  return withMutationFallback(async (): Promise<SimpleResult> => {
    const quote = await getQuote(id);
    if (!quote) return { success: false, error: "Orçamento não encontrado." };
    if (quote.status === "rascunho") {
      await setQuoteStatus(id, "enviado");
      await logAdminAction("orcamento.enviar", "Quote", id, { number: quote.number, via: "whatsapp" });
      revalidateQuotes(id);
    }
    return { success: true };
  });
}

export async function emailQuoteAction(id: string): Promise<SimpleResult> {
  if (!(await requireAdmin())) return DENIED;
  const quote = await getQuote(id);
  if (!quote) return { success: false, error: "Orçamento não encontrado." };
  if (!quote.customerEmail) return { success: false, error: "Esse orçamento não tem e-mail do cliente." };

  const label = quoteNumberLabel(quote.number);
  const first = quote.customerName.trim().split(/\s+/)[0] ?? quote.customerName;
  const html = renderEmailLayout({
    preheader: `Orçamento ${label} no valor de ${formatPrice(quote.total)}, válido até ${formatStoreDate(quote.validUntil)}.`,
    eyebrow: `Orçamento ${label}`,
    greeting: `Oi, ${first}!`,
    heading: quote.title ? `Seu orçamento: ${quote.title}` : "Seu orçamento está pronto",
    bodyHtml: `<p style="margin:0 0 12px;">Preparamos o orçamento que você pediu. Ele soma <strong>${escapeHtml(formatPrice(quote.total))}</strong> e vale até <strong>${escapeHtml(formatStoreDate(quote.validUntil))}</strong>.</p>
<p style="margin:0;">Pelo botão abaixo você vê todos os itens e baixa o PDF. Para aprovar ou ajustar algo, é só responder este e-mail ou chamar a gente no WhatsApp.</p>`,
    action: { label: "Ver orçamento", url: `${SITE_URL}/orcamento/${quote.token}` },
    contactUrl: await getEmailContactUrl(),
  });
  const sent = await sendEmail({ to: quote.customerEmail, subject: `Orçamento ${label} — Fazaê 3D`, html });
  if (!sent.success) return { success: false, error: sent.error };

  await withMutationFallback(async () => {
    if (quote.status === "rascunho") await setQuoteStatus(id, "enviado");
    await logAdminAction("orcamento.enviar", "Quote", id, { number: quote.number, via: "email" });
    return { success: true };
  });
  revalidateQuotes(id);
  return { success: true };
}

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type ConvertResult = { success: true; orderId: string } | { success: false; error: string };

/**
 * Aprovou: vira pedido (canal WhatsApp), já na fila de produção. Itens do catálogo mantêm o produto;
 * itens livres entram como "avulso-…" (mesmo padrão dos itens de produção). O estoque não é mexido:
 * o orçamento é sob medida e as peças ainda vão ser produzidas.
 */
export async function convertQuoteToOrderAction(id: string, paymentMethod: Order["paymentMethod"]): Promise<ConvertResult> {
  if (!(await requireAdmin())) return DENIED;
  return withMutationFallback(async (): Promise<ConvertResult> => {
    const quote: Quote | undefined = await getQuote(id);
    if (!quote) return { success: false, error: "Orçamento não encontrado." };
    if (quote.linkedOrderId) return { success: false, error: "Esse orçamento já virou pedido." };

    const items: OrderItem[] = [];
    for (const item of quote.items) {
      const product = item.productSlug ? await getProduct(item.productSlug) : undefined;
      items.push({
        productSlug: product ? product.slug : `avulso-${slugify(item.description) || "item"}`,
        name: item.description,
        categoryName: product?.categoryName ?? "Avulso",
        material: item.details || "—",
        color: "—",
        quantity: item.quantity,
        price: item.unitPrice,
      });
    }

    const order: Order = {
      id: generateOrderId(),
      createdAt: new Date().toISOString(),
      channel: "whatsapp",
      customerName: quote.customerName,
      customerPhone: quote.customerPhone,
      userEmail: quote.customerEmail,
      items,
      subtotal: quote.subtotal,
      shipping: quote.shipping,
      discount: quote.discount,
      total: quote.total,
      paymentMethod,
      status: "Pedido recebido",
    };
    const created = await addOrder(order, { forceProductionPending: true });
    await linkQuoteToOrder(id, created.id);
    if (quote.linkedRequestId) {
      await updateCustomOrderRequest(quote.linkedRequestId, { status: "fechado", linkedOrderId: created.id }).catch(() => null);
      revalidatePath("/admin/encomendas");
    }
    await logAdminAction("orcamento.converter", "Quote", id, { number: quote.number, orderId: created.id });
    revalidateQuotes(id);
    revalidatePath("/admin/pedidos");
    revalidatePath("/admin/producao");
    revalidatePath("/admin/financas");
    return { success: true, orderId: created.id };
  });
}

/** Registra que o cliente foi chamado para acompanhar o orçamento (ele sai da lista "Acompanhar" por 3 dias). */
export async function markQuoteFollowUpAction(id: string): Promise<SimpleResult> {
  if (!(await requireAdmin())) return DENIED;
  return withMutationFallback(async (): Promise<SimpleResult> => {
    const quote = await getQuote(id);
    if (!quote) return { success: false, error: "Orçamento não encontrado." };
    await markQuoteFollowedUp(id);
    await logAdminAction("orcamento.acompanhar", "Quote", id, { number: quote.number });
    revalidateQuotes(id);
    return { success: true };
  });
}
