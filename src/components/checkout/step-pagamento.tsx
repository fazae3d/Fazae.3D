"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "../form-field";
import { cardPaymentSchema, type CardPaymentInput } from "@/lib/validation";
import { formatPrice } from "@/lib/format";
import type { PaymentMethod } from "@/server/types";

const METHODS: { key: PaymentMethod; label: string }[] = [
  { key: "pix", label: "PIX" },
  { key: "cartao", label: "Cartão" },
  { key: "boleto", label: "Boleto" },
];

function FakeQrCode() {
  return (
    <div
      className="h-40 w-40 shrink-0"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, #111111 0 6px, transparent 6px 12px), repeating-linear-gradient(90deg, #111111 0 6px, transparent 6px 12px)",
        backgroundColor: "#ffffff",
        border: "1px solid #e8e8e8",
      }}
      aria-hidden="true"
    />
  );
}

function FakeBarcode() {
  return (
    <div
      className="h-16 w-full max-w-xs"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, #111111 0 2px, transparent 2px 5px, #111111 5px 6px, transparent 6px 11px)",
      }}
      aria-hidden="true"
    />
  );
}

export function StepPagamento({
  total,
  onPaid,
  onBack,
}: {
  total: number;
  onPaid: (method: PaymentMethod) => Promise<void>;
  onBack: () => void;
}) {
  const [method, setMethod] = useState<PaymentMethod>("pix");
  const [processing, setProcessing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CardPaymentInput>({ resolver: zodResolver(cardPaymentSchema) });

  const simulatePayment = async () => {
    setProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    await onPaid(method);
    setProcessing(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <p className="label-caps text-xs text-graphite">Forma de pagamento</p>

      <div className="flex gap-2">
        {METHODS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMethod(m.key)}
            className={`label-caps flex-1 border px-4 py-3 text-xs transition-colors ${
              method === m.key ? "border-petrol bg-petrol text-ink" : "border-paper/15 text-graphite hover:border-petrol"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      <p className="text-sm text-graphite">
        Ambiente de testes: nenhum pagamento real é processado. Total a pagar:{" "}
        <span className="text-paper">{formatPrice(total)}</span>
      </p>

      {method === "pix" && (
        <div className="flex flex-col items-center gap-4 border border-paper/15 p-8 text-center">
          <FakeQrCode />
          <p className="w-full max-w-xs break-all text-xs text-graphite">
            DEMO00020126360014BR.GOV.BCB.PIX0114FAZAE3D5204000053039865802BR5909FAZAE LTDA
          </p>
          <button
            type="button"
            onClick={simulatePayment}
            disabled={processing}
            className="label-caps bg-petrol px-8 py-4 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
          >
            {processing ? "Confirmando pagamento..." : "Simular pagamento aprovado"}
          </button>
        </div>
      )}

      {method === "boleto" && (
        <div className="flex flex-col items-center gap-4 border border-paper/15 p-8 text-center">
          <FakeBarcode />
          <p className="text-xs text-graphite">Vencimento em 3 dias úteis, código de barras demonstrativo.</p>
          <button
            type="button"
            onClick={simulatePayment}
            disabled={processing}
            className="label-caps bg-petrol px-8 py-4 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
          >
            {processing ? "Confirmando pagamento..." : "Simular pagamento aprovado"}
          </button>
        </div>
      )}

      {method === "cartao" && (
        <form
          onSubmit={handleSubmit(async () => {
            setProcessing(true);
            await new Promise((resolve) => setTimeout(resolve, 900));
            await onPaid(method);
            setProcessing(false);
          })}
          className="flex flex-col gap-4 border border-paper/15 p-8"
        >
          <FormField
            id="cardName"
            label="Nome impresso no cartão"
            error={errors.cardName?.message}
            {...register("cardName")}
          />
          <FormField
            id="cardNumber"
            label="Número do cartão"
            placeholder="0000 0000 0000 0000"
            error={errors.cardNumber?.message}
            {...register("cardNumber")}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormField
              id="cardExpiry"
              label="Validade (MM/AA)"
              placeholder="MM/AA"
              error={errors.cardExpiry?.message}
              {...register("cardExpiry")}
            />
            <FormField id="cardCvv" label="CVV" placeholder="000" error={errors.cardCvv?.message} {...register("cardCvv")} />
          </div>
          <button
            type="submit"
            disabled={processing}
            className="label-caps bg-petrol py-4 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
          >
            {processing ? "Confirmando pagamento..." : `Pagar ${formatPrice(total)}`}
          </button>
        </form>
      )}

      <button
        type="button"
        onClick={onBack}
        className="label-caps self-start border border-paper/15 px-8 py-4 text-xs text-graphite transition-colors hover:border-petrol hover:text-petrol"
      >
        Voltar
      </button>
    </div>
  );
}
