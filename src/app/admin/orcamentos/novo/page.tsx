import { PageHeader } from "@/components/admin/page-header";
import { QuoteForm, type QuoteFormInitial } from "@/components/admin/quote-form";
import { withReadFallback } from "@/lib/db-fallback";
import {
  DEFAULT_QUOTE_DELIVERY,
  DEFAULT_QUOTE_NOTES,
  DEFAULT_QUOTE_PAYMENT,
  DEFAULT_QUOTE_VALIDITY_DAYS,
  validityFromNow,
} from "@/lib/quote";
import { getCustomOrderRequest } from "@/server/repositories/custom-order-request-repository";
import { getCustomer } from "@/server/repositories/customer-repository";
import { loadQuoteFormOptions } from "../form-data";

export default async function NewQuotePage({ searchParams }: PageProps<"/admin/orcamentos/novo">) {
  const params = await searchParams;
  const leadId = typeof params.lead === "string" ? params.lead : "";
  const lead = leadId ? await withReadFallback(() => getCustomOrderRequest(leadId), undefined) : undefined;
  const customerId = typeof params.cliente === "string" ? params.cliente : "";
  const known = customerId ? await withReadFallback(() => getCustomer(customerId), undefined) : undefined;
  const { products, customers } = await loadQuoteFormOptions();

  const initial: QuoteFormInitial = {
    customerName: lead?.name ?? known?.name ?? "",
    customerPhone: lead?.phone ?? known?.phone ?? "",
    customerEmail: lead?.email ?? known?.email ?? "",
    customerDocument: "",
    customerAddress: "",
    title: lead ? "Encomenda personalizada" : "",
    items: lead
      ? [
          {
            description: lead.description.slice(0, 140),
            details: [lead.materialPreference, lead.colorPreference].filter(Boolean).join(" · ") || undefined,
            quantity: lead.quantity,
            unitPrice: 0,
          },
        ]
      : [],
    discount: 0,
    shipping: 0,
    validUntil: validityFromNow(DEFAULT_QUOTE_VALIDITY_DAYS),
    deliveryTime: DEFAULT_QUOTE_DELIVERY,
    paymentTerms: DEFAULT_QUOTE_PAYMENT,
    notes: DEFAULT_QUOTE_NOTES,
    linkedRequestId: lead?.id,
  };

  return (
    <div>
      <PageHeader
        title="Novo orçamento"
        description={lead ? `A partir do pedido de encomenda de ${lead.name}.` : "Monte a proposta, salve e gere o PDF para enviar ao cliente."}
      />
      <QuoteForm quoteId={null} initial={initial} products={products} customers={customers} />
    </div>
  );
}
