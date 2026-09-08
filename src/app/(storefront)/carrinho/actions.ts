"use server";

import { validateCouponWithFallback } from "@/server/coupon-validation";
import { getClientIp, rateLimit } from "@/server/rate-limit";

const COUPON_LIMIT = 20;
const COUPON_WINDOW_MS = 10 * 60 * 1000;

export async function applyCouponAction(code: string, subtotal: number) {
  // Without this, /carrinho's coupon field is a free brute-force oracle
  // for guessing valid codes — 20 tries / 10 min is plenty for a person
  // typing a code, not for a script trying a wordlist.
  const ip = await getClientIp();
  const limited = rateLimit(`coupon:${ip}`, COUPON_LIMIT, COUPON_WINDOW_MS);
  if (!limited.allowed) {
    return { valid: false as const, message: "Muitas tentativas de cupom. Aguarde alguns minutos." };
  }

  return validateCouponWithFallback(code, subtotal);
}
