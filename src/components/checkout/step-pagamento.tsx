"use client";

import { useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { processCheckoutPaymentAction } from "@/app/(storefront)/checkout/actions";
import { formatPrice } from "@/lib/format";
import type { Order } from "@/server/types";

const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;
let mpInitialized = false;

export function StepPagamento({
  total,
  checkoutInput,
  payerEmail,
  onSuccess,
  onError,
  onBack,
}: {
  total: number;
  /** Shape expected by processCheckoutPaymentAction's first argument — items/address/shippingMethod/couponCode/guestEmail. */
  checkoutInput: unknown;
  payerEmail: string;
  onSuccess: (order: Order) => void;
  onError: (message: string) => void;
  onBack: () => void;
}) {
  const [brickError, setBrickError] = useState<string | null>(null);

  if (publicKey && !mpInitialized) {
    initMercadoPago(publicKey, { locale: "pt-BR" });
    mpInitialized = true;
  }

  if (!publicKey) {
    return (
      <p className="border border-paper/15 p-6 text-sm text-graphite">
        Pagamento ainda não configurado. Fale com o suporte para concluir a compra.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="label-caps text-xs text-graphite">Forma de pagamento</p>

      <p className="text-sm text-graphite">
        Ambiente de testes: use um{" "}
        <a
          href="https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/your-integrations/test/cards"
          target="_blank"
          rel="noopener noreferrer"
          className="text-petrol hover:underline"
        >
          cartão de teste do Mercado Pago
        </a>{" "}
        — nenhum pagamento real é processado. Total a pagar:{" "}
        <span className="text-paper">{formatPrice(total)}</span>
      </p>

      {brickError && <p className="text-sm text-red-600">{brickError}</p>}

      <Payment
        key={total}
        initialization={{ amount: total, payer: { email: payerEmail } }}
        customization={{
          paymentMethods: { creditCard: "all", debitCard: "all", ticket: "all", bankTransfer: "all" },
        }}
        onSubmit={async ({ formData }) => {
          setBrickError(null);
          onError("");
          const result = await processCheckoutPaymentAction(checkoutInput, formData);
          if (!result.success) {
            setBrickError(result.error);
            onError(result.error);
            // Rejecting keeps the Brick's own submit button usable for a retry.
            throw new Error(result.error);
          }
          onSuccess(result.order);
        }}
        onError={(error) => {
          console.error("[mercadopago brick]", error);
          setBrickError("Não foi possível carregar o pagamento. Recarregue a página e tente novamente.");
        }}
      />

      <button
        type="button"
        onClick={onBack}
        className="label-caps self-start rounded-full border border-paper/15 px-8 py-4 text-xs text-graphite transition-colors hover:border-petrol hover:text-petrol"
      >
        Voltar
      </button>
    </div>
  );
}
