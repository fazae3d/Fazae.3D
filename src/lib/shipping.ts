export type ShippingMethod = "padrao" | "expressa";

export const SHIPPING_OPTIONS: {
  key: ShippingMethod;
  label: string;
  eta: string;
  baseCost: number;
  freeShippingEligible: boolean;
}[] = [
  { key: "padrao", label: "Entrega padrão", eta: "5 a 8 dias úteis", baseCost: 24.9, freeShippingEligible: true },
  { key: "expressa", label: "Entrega expressa", eta: "2 a 3 dias úteis", baseCost: 39.9, freeShippingEligible: false },
];

/**
 * Single source of truth for shipping cost — used both for client display
 * and server-side order totals. `freeShippingThreshold` is passed in
 * rather than read from a constant so it always reflects the live value
 * from /admin/configuracoes, not whatever was baked in at build time.
 */
export function computeShippingCost(method: ShippingMethod, subtotal: number, freeShippingThreshold: number) {
  const option = SHIPPING_OPTIONS.find((o) => o.key === method) ?? SHIPPING_OPTIONS[0];
  if (option.freeShippingEligible && subtotal >= freeShippingThreshold) return 0;
  return option.baseCost;
}
