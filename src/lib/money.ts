/**
 * Single point of monetary rounding. JS float math produces residues like
 * 27.980000000000004 (e.g. 279.80 * 10 / 100) — round2() is applied at every
 * point a total is computed so those residues never reach storage or a
 * price comparison, only display formatting (which would have hidden them).
 */
export function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Discount applied when paying via Pix, shown as the headline price across the store. */
export const PIX_DISCOUNT = 0.05;

export function pixPrice(price: number) {
  return round2(price * (1 - PIX_DISCOUNT));
}
