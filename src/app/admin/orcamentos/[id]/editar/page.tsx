import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { QuoteForm, type QuoteFormInitial } from "@/components/admin/quote-form";
import { quoteNumberLabel } from "@/lib/quote";
import { storeDayKey } from "@/lib/store-time";
import { getQuote } from "@/server/repositories/quote-repository";
import { loadQuoteFormOptions } from "../../form-data";

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getQuote(id).catch(() => undefined);
  if (!quote) notFound();
  const { products, customers } = await loadQuoteFormOptions();

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
    validUntil: storeDayKey(new Date(quote.validUntil)),
    deliveryTime: quote.deliveryTime ?? "",
    paymentTerms: quote.paymentTerms ?? "",
    notes: quote.notes ?? "",
    linkedRequestId: quote.linkedRequestId,
  };

  return (
    <div>
      <PageHeader title={`Editar ${quoteNumberLabel(quote.number)}`} description={`Orçamento de ${quote.customerName}.`} />
      <QuoteForm quoteId={quote.id} initial={initial} products={products} customers={customers} />
    </div>
  );
}
