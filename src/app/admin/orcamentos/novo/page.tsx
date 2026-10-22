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
import { getAllCustomers, getCustomer } from "@/server/repositories/customer-repository";
import { getConversation } from "@/server/repositories/whatsapp-repository";
import { phoneKey } from "@/lib/customer-insights";
import { formatPhone } from "@/lib/whatsapp";
import { loadQuoteFormOptions } from "../form-data";

export default async function NewQuotePage({ searchParams }: PageProps<"/admin/orcamentos/novo">) {
  const params = await searchParams;
  const leadId = typeof params.lead === "string" ? params.lead : "";
  const lead = leadId ? await withReadFallback(() => getCustomOrderRequest(leadId), undefined) : undefined;
  const customerId = typeof params.cliente === "string" ? params.cliente : "";
  const known = customerId ? await withReadFallback(() => getCustomer(customerId), undefined) : undefined;
  const conversationId = typeof params.conversa === "string" ? params.conversa : "";
  const conversation = conversationId ? await withReadFallback(() => getConversation(conversationId), null) : null;
  // Quem veio de uma conversa já pode ser cliente cadastrado: aproveita o e-mail e o nome do cadastro.
  const knownFromChat = conversation
    ? (await withReadFallback(() => getAllCustomers(), [])).find((c) => phoneKey(c.phone) === phoneKey(conversation.phone))
    : undefined;
  const { products, customers } = await loadQuoteFormOptions();

  const initial: QuoteFormInitial = {
    customerName: lead?.name ?? known?.name ?? conversation?.name ?? knownFromChat?.name ?? "",
    customerPhone: lead?.phone ?? known?.phone ?? (conversation ? formatPhone(conversation.phone) : ""),
    customerEmail: lead?.email ?? known?.email ?? knownFromChat?.email ?? "",
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
        description={
          lead
            ? `A partir do pedido de encomenda de ${lead.name}.`
            : conversation
              ? `A partir da conversa com ${conversation.name ?? formatPhone(conversation.phone)}. Depois de salvar, é só enviar pelo Conversas.`
              : "Monte a proposta, salve e gere o PDF para enviar ao cliente."
        }
      />
      <QuoteForm quoteId={null} initial={initial} products={products} customers={customers} />
    </div>
  );
}
