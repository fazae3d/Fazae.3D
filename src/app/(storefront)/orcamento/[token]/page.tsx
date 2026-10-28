import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { QUOTE_STATUS_LABELS, daysUntil, formatStoreDate, quoteCardTerms, quoteDisplayStatus, quoteNumberLabel, quoteSavings } from "@/lib/quote";
import { DEFAULT_WHATSAPP_NUMBER, getWhatsAppLink } from "@/lib/site-config";
import { quotePix } from "@/lib/pix";
import { QuotePixCard } from "@/components/quote-pix-card";
import { pixQrDataUrl } from "@/server/pix-qr";
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
  const savings = quoteSavings(quote);
  const daysLeft = daysUntil(quote.validUntil);
  const open = status !== "vencido" && status !== "recusado" && status !== "aprovado";
  const whatsapp = getWhatsAppLink(
    settings?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER,
    `Olá! Quero aprovar o orçamento ${label} (${formatPrice(quote.total)}${savings.total > 0 ? `, com economia de ${formatPrice(savings.total)}` : ""}).`,
  );
  const pdfHref = `/orcamento/${quote.token}/pdf`;

  // Pix com QR code: só enquanto o orçamento vale (ou já foi aprovado e falta pagar) e se a chave estiver nas Regras da loja.
  const pix = settings && (status === "enviado" || status === "rascunho" || status === "aprovado") ? quotePix(quote, settings.rules) : null;
  const cardTerms = status === "enviado" || status === "rascunho" || status === "aprovado" ? quoteCardTerms(quote) : null;
  const pixQr = pix ? await pixQrDataUrl(pix.payload).catch(() => null) : null;
  const proofHref = pix
    ? getWhatsAppLink(
        settings?.whatsappNumber ?? DEFAULT_WHATSAPP_NUMBER,
        `Olá! Paguei o Pix do orçamento ${label}${pix.amount > 0 ? ` (${formatPrice(pix.amount)})` : ""}. Segue o comprovante.`,
      )
    : undefined;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
      <p className="label-caps text-xs text-petrol">Orçamento {label}</p>
      <h1 className="font-display mt-2 text-3xl sm:text-4xl">{quote.title ?? "Seu orçamento"}</h1>
      <p className="mt-2 text-sm text-graphite">
        Para {quote.customerName} · emitido em {formatStoreDate(quote.createdAt)} · válido até {formatStoreDate(quote.validUntil)}
        {status === "vencido" ? " (vencido)" : status === "aprovado" ? " (aprovado)" : ""}
      </p>

      {savings.total > 0 || savings.freeShipping ? (
        <div className="mt-8 rounded-2xl bg-petrol p-5 text-[#111] sm:p-6">
          <p className="text-xs font-bold uppercase tracking-widest">Você está ganhando</p>
          {savings.total > 0 ? (
            <p className="font-display mt-1 text-3xl sm:text-4xl">Economia de {formatPrice(savings.total)}</p>
          ) : (
            <p className="font-display mt-1 text-3xl sm:text-4xl">Frete grátis</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {savings.discount > 0 ? (
              <span className="rounded-full bg-[#111] px-3 py-1 text-xs font-semibold text-petrol">
                {savings.discountPct > 0 ? `${savings.discountPct}% de desconto` : "Desconto"} · -{formatPrice(savings.discount)}
              </span>
            ) : null}
            {savings.freeShipping ? (
              <span className="rounded-full bg-[#111] px-3 py-1 text-xs font-semibold text-petrol">
                Frete grátis{savings.shippingSaved > 0 ? ` · economiza ${formatPrice(savings.shippingSaved)}` : ""}
              </span>
            ) : null}
          </div>
          {open ? (
            <p className="mt-3 text-sm font-medium">
              {daysLeft <= 0 ? "Condição válida só até hoje." : daysLeft <= 3 ? `Condição válida por mais ${daysLeft} dia(s), até ${formatStoreDate(quote.validUntil)}.` : `Condição válida até ${formatStoreDate(quote.validUntil)}.`}
            </p>
          ) : null}
        </div>
      ) : null}

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
            <div className="flex justify-between font-medium text-petrol">
              <span>Desconto{savings.discountPct > 0 ? ` (${savings.discountPct}%)` : ""}</span>
              <span>- {formatPrice(quote.discount)}</span>
            </div>
          ) : null}
          <div className={`flex justify-between ${savings.freeShipping ? "font-medium text-petrol" : "text-graphite"}`}>
            <span>Frete</span>
            {savings.freeShipping ? (
              <span>
                {savings.shippingSaved > 0 ? <span className="mr-2 text-graphite line-through">{formatPrice(savings.shippingSaved)}</span> : null}
                GRÁTIS
              </span>
            ) : (
              <span>{quote.shipping > 0 ? formatPrice(quote.shipping) : "A combinar / retirada"}</span>
            )}
          </div>
          <div className="flex items-end justify-between pt-2">
            <span className="text-lg font-semibold">Total</span>
            <span className="text-right">
              {savings.total > 0 ? <span className="block text-sm text-graphite line-through">{formatPrice(savings.fullPrice)}</span> : null}
              <span className="text-2xl font-semibold text-petrol">{formatPrice(quote.total)}</span>
            </span>
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

      {pix && pixQr ? (
        <QuotePixCard pix={pix} qr={pixQr} notice={settings?.rules.company.pixNotice} receiver={settings?.rules.company.legalName ?? "Fazaê 3D"} proofHref={proofHref} />
      ) : null}

      {cardTerms ? (
        <section className="mt-8 border border-petrol/40 p-5 sm:p-6" aria-labelledby="card-title">
          <h2 id="card-title" className="font-display text-xl">
            Pagamento no cartão
          </h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            {cardTerms.surcharge > 0 ? (
              <div className="flex justify-between text-graphite">
                <dt>Acréscimo do cartão</dt>
                <dd>{formatPrice(cardTerms.surcharge)}</dd>
              </div>
            ) : (
              <div className="flex justify-between text-petrol">
                <dt>Acréscimo do cartão</dt>
                <dd>Sem acréscimo</dd>
              </div>
            )}
            <div className="flex justify-between text-lg font-semibold">
              <dt>Total no cartão</dt>
              <dd className="text-petrol">{formatPrice(cardTerms.total)}</dd>
            </div>
            {cardTerms.installments > 1 ? (
              <div className="flex justify-between text-graphite">
                <dt>Parcelamento</dt>
                <dd>
                  {cardTerms.installments}x de {formatPrice(cardTerms.perInstallment)}
                </dd>
              </div>
            ) : null}
          </dl>
          <p className="mt-3 text-xs text-graphite">Aprove pelo WhatsApp e combinamos o pagamento no cartão com você.</p>
        </section>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3">
        <a
          href={pdfHref}
          className="label-caps rounded-full bg-petrol px-7 py-3.5 text-xs text-[#111] transition-colors hover:bg-paper"
        >
          Baixar PDF
        </a>
        {open ? (
          <a
            href={whatsapp}
            className="label-caps rounded-full border border-petrol px-7 py-3.5 text-xs text-petrol transition-colors hover:bg-petrol hover:text-[#111]"
          >
            {savings.total > 0 ? "Aprovar e garantir minha economia" : "Aprovar pelo WhatsApp"}
          </a>
        ) : (
          <p className="self-center text-sm text-graphite">
            {QUOTE_STATUS_LABELS[status]}. Fale com a gente no WhatsApp se precisar de uma nova proposta.
          </p>
        )}
      </div>
    </div>
  );
}
