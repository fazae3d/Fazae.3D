"use client";

import { useState } from "react";
import { ButtonLink } from "../button";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/server/types";
import type { PendingPaymentInstructions } from "@/app/(storefront)/checkout/actions";

const isTestMode = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY?.startsWith("TEST-") ?? false;

function PixInstructions({ qrCode, qrCodeBase64 }: { qrCode?: string; qrCodeBase64?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!qrCode) return;
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (permissions, non-secure context) — the code is still selectable/visible below.
    }
  };

  if (!qrCode && !qrCodeBase64) return null;

  return (
    <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-4 border border-petrol/40 bg-petrol/10 p-6">
      <p className="label-caps text-xs text-petrol">Pague com Pix para confirmar o pedido</p>
      {qrCodeBase64 && (
        <img
          src={`data:image/png;base64,${qrCodeBase64}`}
          alt="QR code Pix"
          className="h-48 w-48 bg-paper p-2"
        />
      )}
      {qrCode && (
        <div className="w-full">
          <p className="mb-1.5 text-xs text-graphite">Ou copie o código Pix:</p>
          <div className="flex gap-2">
            <input
              readOnly
              value={qrCode}
              onFocus={(e) => e.target.select()}
              className="flex-1 truncate border border-paper/15 bg-mist px-3 py-2 text-xs text-paper outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className="label-caps shrink-0 border border-petrol px-3 py-2 text-[11px] text-petrol transition-colors hover:bg-petrol hover:text-ink"
            >
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BoletoInstructions({ ticketUrl }: { ticketUrl?: string }) {
  if (!ticketUrl) return null;
  return (
    <div className="mt-8 flex w-full max-w-sm flex-col items-center gap-3 border border-petrol/40 bg-petrol/10 p-6">
      <p className="label-caps text-xs text-petrol">Pague o boleto para confirmar o pedido</p>
      <a
        href={ticketUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="label-caps border border-petrol px-6 py-3 text-xs text-petrol transition-colors hover:bg-petrol hover:text-ink"
      >
        Ver boleto
      </a>
    </div>
  );
}

export function StepConfirmacao({
  order,
  isGuest = false,
  paymentInstructions,
}: {
  order: Order;
  isGuest?: boolean;
  paymentInstructions?: PendingPaymentInstructions;
}) {
  const isApproved = order.status === "Pagamento aprovado";
  const testSuffix = isTestMode ? " (ambiente de testes)" : "";
  const paymentPhrase = isApproved
    ? `o pagamento foi aprovado${testSuffix}`
    : `o pagamento está sendo confirmado (Pix/boleto${testSuffix}). Você recebe um aviso assim que for aprovado`;

  return (
    <div className="flex flex-col items-center border border-paper/15 px-6 py-16 text-center">
      <span className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-petrol text-2xl text-ink">
        ✓
      </span>
      <p className="label-caps text-xs text-petrol">Pedido confirmado</p>
      <h2 className="font-display mt-3 text-3xl text-paper">Pedido {order.id}</h2>
      <p className="mt-3 max-w-md text-graphite">
        {isGuest
          ? `Recebemos seu pedido e ${paymentPhrase}. Guarde o número acima para acompanhar pelo rastreamento com o e-mail ${order.userEmail}.`
          : `Recebemos seu pedido e ${paymentPhrase}. Você pode acompanhar o status em Meus pedidos.`}
      </p>
      <p className="mt-4 text-lg text-paper">{formatPrice(order.total)}</p>

      {!isApproved && (
        <>
          <PixInstructions qrCode={paymentInstructions?.qrCode} qrCodeBase64={paymentInstructions?.qrCodeBase64} />
          <BoletoInstructions ticketUrl={paymentInstructions?.ticketUrl} />
        </>
      )}

      {isGuest && (
        <div className="mt-8 max-w-sm border border-paper/15 bg-mist p-5 text-sm">
          <p className="text-paper">Quer acompanhar seus pedidos com mais facilidade?</p>
          <p className="mt-1 text-graphite">Crie uma conta com o e-mail {order.userEmail}, sem preencher nada de novo.</p>
          <ButtonLink
            href={`/cadastro?email=${encodeURIComponent(order.userEmail ?? "")}`}
            variant="secondary"
            className="mt-4"
          >
            Criar conta
          </ButtonLink>
        </div>
      )}

      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <ButtonLink href={isGuest ? `/rastreamento?pedido=${order.id}` : "/conta/pedidos"} variant="primary">
          {isGuest ? "Rastrear meu pedido" : "Ver meus pedidos"}
        </ButtonLink>
        <ButtonLink href="/loja" variant="secondary">
          Continuar comprando
        </ButtonLink>
      </div>
    </div>
  );
}
