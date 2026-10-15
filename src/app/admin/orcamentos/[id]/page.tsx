import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, StatusBadge } from "@/components/admin/page-header";
import { QuoteActions } from "@/components/admin/quote-actions";
import { formatPrice } from "@/lib/format";
import { QUOTE_STATUS_LABELS, formatStoreDate, quoteDisplayStatus, quoteNumberLabel } from "@/lib/quote";
import { SITE_URL } from "@/lib/site-config";
import { QUOTE_TONES } from "../quote-tones";
import { getQuote } from "@/server/repositories/quote-repository";

export default async function QuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quote = await getQuote(id).catch(() => undefined);
  if (!quote) notFound();

  const status = quoteDisplayStatus(quote);
  const label = quoteNumberLabel(quote.number);

  return (
    <div>
      <PageHeader
        title={`${label}${quote.title ? ` · ${quote.title}` : ""}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge tone={QUOTE_TONES[status]}>{QUOTE_STATUS_LABELS[status]}</StatusBadge>
            <span>
              Emitido em {formatStoreDate(quote.createdAt)} · válido até {formatStoreDate(quote.validUntil)}
              {quote.sentAt ? ` · enviado em ${formatStoreDate(quote.sentAt)}` : ""}
            </span>
          </span>
        }
        actions={
          <Link href="/admin/orcamentos" className="text-sm text-graphite transition-colors hover:text-ink">
            ← Todos os orçamentos
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <section className="admin-card rounded-xl border border-mist">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-mist text-left text-xs text-graphite">
                    <th className="px-5 py-3 font-medium">Descrição</th>
                    <th className="px-3 py-3 text-right font-medium">Qtd</th>
                    <th className="px-3 py-3 text-right font-medium">Unitário</th>
                    <th className="px-5 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, index) => (
                    <tr key={index} className="border-b border-mist last:border-0">
                      <td className="px-5 py-3">
                        <p className="font-medium">{item.description}</p>
                        {item.details ? <p className="mt-0.5 text-xs text-graphite">{item.details}</p> : null}
                      </td>
                      <td className="px-3 py-3 text-right">{item.quantity}</td>
                      <td className="px-3 py-3 text-right">{formatPrice(item.unitPrice)}</td>
                      <td className="px-5 py-3 text-right font-medium">{formatPrice(item.quantity * item.unitPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ml-auto w-full max-w-xs space-y-1.5 border-t border-mist p-5 text-sm">
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
          </section>

          <section className="admin-card grid grid-cols-1 gap-5 rounded-xl border border-mist p-5 text-sm sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-graphite">Cliente</p>
              <p className="font-medium">{quote.customerName}</p>
              {quote.customerDocument ? <p className="text-graphite">CPF/CNPJ {quote.customerDocument}</p> : null}
              {quote.customerPhone ? <p className="text-graphite">{quote.customerPhone}</p> : null}
              {quote.customerEmail ? <p className="text-graphite">{quote.customerEmail}</p> : null}
              {quote.customerAddress ? <p className="text-graphite">{quote.customerAddress}</p> : null}
            </div>
            <div className="space-y-3">
              {quote.deliveryTime ? (
                <div>
                  <p className="mb-0.5 text-xs font-medium text-graphite">Prazo de entrega</p>
                  <p>{quote.deliveryTime}</p>
                </div>
              ) : null}
              {quote.paymentTerms ? (
                <div>
                  <p className="mb-0.5 text-xs font-medium text-graphite">Condições de pagamento</p>
                  <p>{quote.paymentTerms}</p>
                </div>
              ) : null}
              {quote.notes ? (
                <div>
                  <p className="mb-0.5 text-xs font-medium text-graphite">Observações</p>
                  <p className="whitespace-pre-line">{quote.notes}</p>
                </div>
              ) : null}
            </div>
          </section>
        </div>

        <QuoteActions
          publicUrl={SITE_URL}
          quote={{
            id: quote.id,
            number: quote.number,
            token: quote.token,
            status: quote.status,
            customerName: quote.customerName,
            customerPhone: quote.customerPhone,
            customerEmail: quote.customerEmail,
            total: quote.total,
            validUntil: quote.validUntil,
            linkedOrderId: quote.linkedOrderId,
          }}
        />
      </div>
    </div>
  );
}
