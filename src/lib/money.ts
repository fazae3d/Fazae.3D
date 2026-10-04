/**
 * Single point of monetary rounding. JS float math produces residues like
 * 27.980000000000004 (e.g. 279.80 * 10 / 100) — round2() is applied at every
 * point a total is computed so those residues never reach storage or a
 * price comparison, only display formatting (which would have hidden them).
 */
export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Default Pix discount (%) — the live value comes from /admin/configuracoes (Settings.pixDiscountPct). */
export const DEFAULT_PIX_DISCOUNT_PCT = 5;

/**
 * Discount for an order, given the coupon discount already computed and the Pix %.
 * Paying with Pix never stacks with a coupon: the customer gets whichever is larger.
 * Shared by the checkout UI (to preview the Pix total) and the server (to charge it),
 * so what's shown is exactly what's billed.
 */
export function resolveOrderDiscount({
  subtotal,
  couponDiscount,
  pixPct,
  isPix,
}: {
  subtotal: number;
  couponDiscount: number;
  pixPct: number;
  isPix: boolean;
}) {
  const pixDiscount = isPix ? round2(subtotal * (pixPct / 100)) : 0;
  const pixWins = isPix && pixDiscount > couponDiscount;
  return { discount: pixWins ? pixDiscount : couponDiscount, pixWins };
}

/** "5" / "7,5" — integers stay clean, fractions keep one decimal so a 7,5% discount isn't advertised as 8%. */
export function formatPct(pct: number) {
  return (Math.round(pct * 10) / 10).toLocaleString("pt-BR");
}

/** Headline price shown "no Pix": `pct` is a percentage (10 = 10% off). */
export function pixPrice(price: number, pct: number) {
  return round2(price * (1 - pct / 100));
}
