import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { QUOTE_STATUS_LABELS, formatStoreDate, quoteDisplayStatus, quoteNumberLabel } from "@/lib/quote";
import { DEFAULT_WHATSAPP_NUMBER, getWhatsAppLink } from "@/lib/site-config";
import { getQuoteByToken } from "@/server/repositories/quote-repository";
import { getSettings } from "@/server/repositories/settings-repository";

export const metadata: Metadata = {
  title: "Seu orçamento",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PublicQuotePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const quote = await getQuoteByToken(token).catch(() => undefined);
  if (!quote) notFound();

  const settings = await getSettings().catch(() => null);
  const label = quoteNumberLabel(quote.number);
  const status = quoteDisplayStatus(quote);
  const whatsapp = getWhatsAppLink(
    settings?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER,
    `Olá! Quero aprovar o orçamento ${label} (${formatPrice(quote.total)}).`,
  );
  const pdfHref = `/orcamento/${quote.token}/pdf`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="label-caps text-xs text-petrol">Orçamento {label}</p>
      <h1 className="font-display mt-2 text-3xl sm:text-4xl">{quote.title ?? "Seu orçamento"}</h1>
      <p className="mt-2 text-sm text-graphite">
        Para {quote.customerName} · emitido em {formatStoreDate(quote.createdAt)} · válido até {formatStoreDate(quote.validUntil)}
        {status === "vencido" ? " (vencido)" : status === "aprovado" ? " (aprovado)" : ""}
      </p>

      <div className="mt-8 divide-y divide-mist border border-mist">
        {quote.items.map((item, index) => (
          <div key={index} className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <p className="font-medium">{item.description}</p>
              {item.details ? <p className="mt-1 text-sm text-graphite">{item.details}</p> : null}
              <p className="mt-1 text-sm text-graphite">
                {item.quantity} × {formatPrice(item.unitPrice)}
              </p>
            </div>
            <p className="shrink-0 font-medium">{formatPrice(item.quantity * item.unitPrice)}</p>
          </div>
        ))}
        <div className="space-y-1.5 p-4 text-sm">
          <div className="flex justify-between text-graphite">
            <span>Subtotal</span>
            <span>{formatPrice(quote.subtotal)}</span>
          </div>
          {quote.discount > 0 ? (
            <div className="flex justify-between text-graphite">
              <span>Desconto</span>
              <span>- {formatPrice(quote.discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-graphite">
            <span>Frete</span>
            <span>{quote.shipping > 0 ? formatPrice(quote.shipping) : "A combinar / retirada"}</span>
          </div>
          <div className="flex justify-between pt-2 text-lg font-semibold">
            <span>Total</span>
            <span className="text-petrol">{formatPrice(quote.total)}</span>
          </div>
        </div>
      </div>

      {(quote.deliveryTime || quote.paymentTerms || quote.notes) && (
        <dl className="mt-8 space-y-5 text-sm">
          {quote.deliveryTime ? (
            <div>
              <dt className="label-caps text-[11px] text-graphite">Prazo de entrega</dt>
              <dd className="mt-1">{quote.deliveryTime}</dd>
            </div>
          ) : null}
          {quote.paymentTerms ? (
            <div>
              <dt className="label-caps text-[11px] text-graphite">Condições de pagamento</dt>
              <dd className="mt-1">{quote.paymentTerms}</dd>
            </div>
          ) : null}
          {quote.notes ? (
            <div>
              <dt className="label-caps text-[11px] text-graphite">Observações</dt>
              <dd className="mt-1 whitespace-pre-line">{quote.notes}</dd>
            </div>
          ) : null}
        </dl>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href={pdfHref}
          className="label-caps rounded-full bg-petrol px-7 py-3.5 text-xs text-[#111] transition-colors hover:bg-paper"
        >
          Baixar PDF
        </a>
        {status !== "vencido" && status !== "recusado" && status !== "aprovado" ? (
          <a
            href={whatsapp}
            className="label-caps rounded-full border border-petrol px-7 py-3.5 text-xs text-petrol transition-colors hover:bg-petrol hover:text-[#111]"
          >
            Aprovar pelo WhatsApp
          </a>
        ) : (
          <p className="self-center text-sm text-graphite">
            {QUOTE_STATUS_LABELS[status]} — fale com a gente no WhatsApp se precisar de uma nova proposta.
          </p>
        )}
      </div>
    </div>
  );
}
