"use client";

import { useState } from "react";
import { SHIPPING_OPTIONS, computeShippingCost, type ShippingMethod } from "@/lib/shipping";
import { formatPrice } from "@/lib/format";

export type ShippingOption = {
  key: ShippingMethod;
  label: string;
  eta: string;
  cost: number;
};

export function StepEntrega({
  subtotal,
  freeShippingThreshold,
  initial,
  freeOverride = false,
  onNext,
  onBack,
}: {
  subtotal: number;
  freeShippingThreshold: number;
  initial?: ShippingMethod;
  freeOverride?: boolean;
  onNext: (option: ShippingOption) => void;
  onBack: () => void;
}) {
  const options: ShippingOption[] = SHIPPING_OPTIONS.map((o) => ({
    key: o.key,
    label: o.label,
    eta: o.eta,
    cost: freeOverride ? 0 : computeShippingCost(o.key, subtotal, freeShippingThreshold),
  }));

  const [selected, setSelected] = useState<ShippingMethod>(initial ?? "padrao");

  return (
    <div className="flex flex-col gap-5">
      <p className="label-caps text-xs text-graphite">Forma de entrega</p>

      <div className="flex flex-col gap-3">
        {options.map((option) => (
          <label
            key={option.key}
            className={`flex cursor-pointer items-center justify-between border p-5 transition-colors ${
              selected === option.key ? "border-petrol" : "border-paper/15 hover:border-graphite"
            }`}
          >
            <div className="flex items-center gap-3">
              <input
                type="radio"
                name="shipping"
                checked={selected === option.key}
                onChange={() => setSelected(option.key)}
                className="h-4 w-4 accent-petrol"
              />
              <div>
                <p className="text-sm text-paper">{option.label}</p>
                <p className="text-xs text-graphite">{option.eta}</p>
              </div>
            </div>
            <span className="text-sm text-paper">{option.cost === 0 ? "Grátis" : formatPrice(option.cost)}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="label-caps border border-paper/15 px-8 py-4 text-xs text-graphite transition-colors hover:border-petrol hover:text-petrol"
        >
          Voltar
        </button>
        <button
          type="button"
          onClick={() => onNext(options.find((o) => o.key === selected)!)}
          className="label-caps flex-1 bg-petrol py-4 text-xs text-ink transition-colors hover:bg-paper"
        >
          Continuar para pagamento
        </button>
      </div>
    </div>
  );
}
