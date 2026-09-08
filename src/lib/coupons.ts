import { round2 } from "./money";

export type CouponType = "percentual" | "fixo" | "frete-gratis";

/** Shared by the cart (client, live preview) and the checkout action (server, authoritative). */
export function computeCouponDiscount(subtotal: number, type: CouponType, value: number) {
  if (type === "percentual") return round2(Math.min(subtotal, (subtotal * value) / 100));
  if (type === "fixo") return round2(Math.min(subtotal, value));
  return 0;
}
