"use client";

import { useState } from "react";
import { useCart } from "@/contexts/cart-context";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";
import { SHIPPING_OPTIONS } from "@/lib/shipping";
import { quoteShippingAction } from "@/app/actions/shipping";
import type { ShippingQuote } from "@/lib/melhor-envio";

/** Shown on the PDP — the point where the purchase decision actually happens, not just at cart/checkout. */
export function ShippingEstimate({
  productSlug,
  price,
  quantity,
}: {
  productSlug: string;
  price: number;
  quantity: number;
}) {
  const { subtotal } = useCart();
  const { settings } = useStoreSettings();
  const potentialSubtotal = round2(subtotal + price * quantity);
  const remaining = round2(Math.max(0, settings.freeShippingThreshold - potentialSubtotal));

  const [cep, setCep] = useState("");
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState<ShippingQuote[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) {
      setError("Informe um CEP válido.");
      return;
    }
    setError(null);
    setLoading(true);
    setQuotes(null);
    const result = await quoteShippingAction(digits, [{ productSlug, quantity }]);
    setLoading(false);
    if (result.length === 0) {
      setError("Não foi possível calcular o frete para esse CEP agora.");
      return;
    }
    setQuotes(result);
  };

  return (
    <div className="border border-paper/15 p-4 text-xs text-graphite">
      <div className="flex items-start gap-2.5">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-petrol"
        >
          <path d="M3 7h11v9H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle cx="7.5" cy="18" r="1.6" />
          <circle cx="17.5" cy="18" r="1.6" />
        </svg>
        <div className="flex-1">
          {remaining > 0 ? (
            <p>
              Faltam <strong className="text-paper">{formatPrice(remaining)}</strong> para o frete grátis
            </p>
          ) : (
            <p className="text-petrol">Este item já garante frete grátis 🎉</p>
          )}

          <div className="mt-2 flex gap-2">
            <input
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              placeholder="Calcular frete (CEP)"
              maxLength={9}
              className="w-32 border border-paper/15 bg-mist px-2.5 py-1.5 text-xs text-paper outline-none placeholder:text-paper/40 focus:border-petrol"
            />
            <button
              type="button"
              onClick={handleCalculate}
              disabled={loading}
              className="label-caps border border-paper/15 px-3 py-1.5 text-[10px] text-paper transition-colors hover:border-petrol disabled:opacity-60"
            >
              {loading ? "Calculando..." : "Calcular"}
            </button>
          </div>
          {error && <p className="mt-1.5 text-red-500">{error}</p>}

          {quotes ? (
            <ul className="mt-2 space-y-0.5">
              {quotes.map((q) => (
                <li key={q.id}>
                  {q.company ? `${q.name} (${q.company})` : q.name}: {formatPrice(q.price)} · {q.deliveryDays} dia
                  {q.deliveryDays > 1 ? "s" : ""} útil(eis)
                </li>
              ))}
            </ul>
          ) : (
            <ul className="mt-1.5 space-y-0.5">
              {SHIPPING_OPTIONS.map((option) => (
                <li key={option.key}>
                  {option.label}: {option.eta}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
