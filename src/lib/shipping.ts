import { DEFAULT_RULES, type StoreRules } from "@/lib/store-rules";

export type ShippingMethod = "padrao" | "expressa";

export type ShippingOptionConfig = {
  key: ShippingMethod;
  label: string;
  eta: string;
  baseCost: number;
  freeShippingEligible: boolean;
};

/** Frete fixo (usado quando não há cotação real por CEP). Valores e prazos vêm das Regras da loja; sem elas, o padrão. */
export function getShippingOptions(rules: Pick<StoreRules, "shipping"> = DEFAULT_RULES): ShippingOptionConfig[] {
  return [
    { key: "padrao", label: "Entrega padrão", eta: rules.shipping.standardEta, baseCost: rules.shipping.standardCost, freeShippingEligible: true },
    { key: "expressa", label: "Entrega expressa", eta: rules.shipping.expressEta, baseCost: rules.shipping.expressCost, freeShippingEligible: false },
  ];
}

export const SHIPPING_OPTIONS = getShippingOptions();

/**
 * Single source of truth for shipping cost, used both for client display
 * and server-side order totals. `freeShippingThreshold` is passed in
 * rather than read from a constant so it always reflects the live value
 * from /admin/configuracoes, not whatever was baked in at build time.
 */
export function computeShippingCost(
  method: ShippingMethod,
  subtotal: number,
  freeShippingThreshold: number,
  rules: Pick<StoreRules, "shipping"> = DEFAULT_RULES,
) {
  const options = getShippingOptions(rules);
  const option = options.find((o) => o.key === method) ?? options[0];
  if (option.freeShippingEligible && subtotal >= freeShippingThreshold) return 0;
  return option.baseCost;
}
