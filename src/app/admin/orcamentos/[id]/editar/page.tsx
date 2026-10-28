import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { QuoteForm, type QuoteFormInitial } from "@/components/admin/quote-form";
import { quoteNumberLabel } from "@/lib/quote";
import { storeDayKey } from "@/lib/store-time";
import { getQuote } from "@/server/repositories/quote-repository";
import { loadQuoteFormOptions } from "../../form-data";
import { getStoreRules } from "@/server/store-rules";
import { isValidPixKey } from "@/lib/pix";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getQuote(id).catch(() => undefined);
  if (!quote) notFound();
  const { products, customers } = await loadQuoteFormOptions();
  const { pix: pixRules } = await getStoreRules();

  const initial: QuoteFormInitial = {
    customerName: quote.customerName,
    customerPhone: quote.customerPhone ?? "",
    customerEmail: quote.customerEmail ?? "",
    customerDocument: quote.customerDocument ?? "",
    customerAddress: quote.customerAddress ?? "",
    title: quote.title ?? "",
    items: quote.items,
    discount: quote.discount,
    shipping: quote.shipping,
    freeShipping: quote.freeShipping,
    shippingOriginal: quote.shippingOriginal,
    validUntil: storeDayKey(new Date(quote.validUntil)),
    deliveryTime: quote.deliveryTime ?? "",
    paymentTerms: quote.paymentTerms ?? "",
    notes: quote.notes ?? "",
    // Orçamento antigo sem escolha usa o padrão da loja (o mesmo que a página pública mostra).
    pixDepositPct: quote.pixDepositPct ?? pixRules.depositPct,
    paymentMethod: quote.paymentMethod ?? "pix",
    cardSurcharge: quote.cardSurcharge,
    cardInstallments: quote.cardInstallments,
    linkedRequestId: quote.linkedRequestId,
  };

  return (
    <div>
      <PageHeader title={`Editar ${quoteNumberLabel(quote.number)}`} description={`Orçamento de ${quote.customerName}.`} />
      <QuoteForm quoteId={quote.id} initial={initial} products={products} customers={customers} pixKeyConfigured={isValidPixKey(pixRules.key)} />
    </div>
  );
}
