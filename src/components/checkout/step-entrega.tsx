"use client";

import { useEffect, useState } from "react";
import { SHIPPING_OPTIONS, computeShippingCost, type ShippingMethod } from "@/lib/shipping";
import { checkLocalDeliveryAction, quoteShippingAction, type ShippingQuoteInput } from "@/app/actions/shipping";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";
import {
  LOCAL_DELIVERY_ETA,
  LOCAL_DELIVERY_LABEL,
  localDeliveryCost,
  type LocalDeliveryRules,
} from "@/lib/local-delivery";

export type ShippingOption =
  | { kind: "local"; label: string; eta: string; cost: number }
  | { kind: "quote"; serviceId: number; label: string; eta: string; cost: number }
  | { kind: "flat"; key: ShippingMethod; label: string; eta: string; cost: number };

function etaLabel(deliveryDays: number) {
  return deliveryDays > 0 ? `${deliveryDays} dia${deliveryDays > 1 ? "s" : ""} útil(eis)` : "Prazo a confirmar";
}

export function shippingOptionKey(o: ShippingOption) {
  if (o.kind === "local") return "local";
  return o.kind === "quote" ? `quote-${o.serviceId}` : `flat-${o.key}`;
}

export function StepEntrega({
  subtotal,
  freeShippingThreshold,
  localDelivery,
  destinationCep,
  items,
  initial,
  freeOverride = false,
  onSelect,
  onNext,
  onBack,
}: {
  subtotal: number;
  freeShippingThreshold: number;
  localDelivery: LocalDeliveryRules;
  destinationCep: string;
  items: ShippingQuoteInput[];
  initial?: string;
  freeOverride?: boolean;
  /** Fired on every radio change, so the sidebar total can reflect the pick live instead of only after "Continuar". */
  onSelect?: (option: ShippingOption) => void;
  onNext: (option: ShippingOption) => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [quoteOptions, setQuoteOptions] = useState<ShippingOption[] | null>(null);
  const [localEligible, setLocalEligible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const quotesRequest = quoteShippingAction(destinationCep, items);
    const localRequest = checkLocalDeliveryAction(destinationCep);
    Promise.all([quotesRequest, localRequest]).then(([quotes, isLocalCity]) => {
      if (cancelled) return;
      setLocalEligible(isLocalCity);
      setQuoteOptions(
        quotes.length > 0
          ? quotes.map((q) => ({
              kind: "quote" as const,
              serviceId: q.id,
              label: q.company ? `${q.name} (${q.company})` : q.name,
              eta: etaLabel(q.deliveryDays),
              cost: q.price,
            }))
          : null,
      );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destinationCep]);

  // `option.cost` always holds the true price — a free-shipping coupon only
  // changes what's *displayed*/charged at the top level (checkout/page.tsx),
  // never gets baked into the option itself. That way toggling the coupon
  // after a quote was already picked can't leave a stale zeroed-out price behind.
  const flatOptions: ShippingOption[] = SHIPPING_OPTIONS.map((o) => ({
    kind: "flat" as const,
    key: o.key,
    label: o.label,
    eta: o.eta,
    cost: computeShippingCost(o.key, subtotal, freeShippingThreshold),
  }));

  // Own-logistics delivery only exists for Natal/Parnamirim, and is always
  // listed first when it applies: free from the minimum, flat fee below it.
  const localCost = localDeliveryCost(subtotal, localDelivery);
  const localOption: ShippingOption[] = localEligible
    ? [{ kind: "local", label: LOCAL_DELIVERY_LABEL, eta: LOCAL_DELIVERY_ETA, cost: localCost }]
    : [];
  const remainingForLocal = round2(Math.max(0, localDelivery.threshold - subtotal));

  const options = [...localOption, ...(quoteOptions ?? flatOptions)];

  const [selected, setSelected] = useState<string | undefined>(initial);

  const selectOption = (key: string) => {
    setSelected(key);
    onSelect?.(options.find((o) => shippingOptionKey(o) === key)!);
  };

  // Once quotes resolve (or fall back), select the first option by default
  // and report it immediately, so the sidebar shows a real cost right away
  // instead of "A calcular" until the user clicks a radio that's already selected.
  useEffect(() => {
    if (loading || options.length === 0) return;
    const current = options.find((o) => shippingOptionKey(o) === selected) ?? options[0];
    setSelected(shippingOptionKey(current));
    onSelect?.(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, quoteOptions]);

  return (
    <div className="flex flex-col gap-5">
      <p className="label-caps text-xs text-graphite">Forma de entrega</p>

      {loading ? (
        <p className="text-sm text-graphite">Calculando opções de frete para {destinationCep}...</p>
      ) : (
        <div className="flex flex-col gap-3">
          {localEligible && remainingForLocal > 0 && (
            <p className="text-xs text-petrol">
              Faltam <strong>{formatPrice(remainingForLocal)}</strong> para a entrega por motoboy ficar grátis.
            </p>
          )}
          {options.map((option) => {
            const key = shippingOptionKey(option);
            return (
              <label
                key={key}
                className={`flex cursor-pointer items-center justify-between border p-5 transition-colors ${
                  selected === key ? "border-petrol" : "border-paper/15 hover:border-graphite"
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="shipping"
                    checked={selected === key}
                    onChange={() => selectOption(key)}
                    className="h-4 w-4 accent-petrol"
                  />
                  <div>
                    <p className="text-sm text-paper">{option.label}</p>
                    <p className="text-xs text-graphite">{option.eta}</p>
                  </div>
                </div>
                <span className="text-sm text-paper">
                  {freeOverride || option.cost === 0 ? "Grátis" : formatPrice(option.cost)}
                </span>
              </label>
            );
          })}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="label-caps rounded-full border border-paper/15 px-8 py-4 text-xs text-graphite transition-colors hover:border-petrol hover:text-petrol"
        >
          Voltar
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => onNext(options.find((o) => shippingOptionKey(o) === selected)!)}
          className="label-caps flex-1 rounded-full bg-petrol py-4 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
        >
          Continuar para pagamento
        </button>
      </div>
    </div>
  );
}
