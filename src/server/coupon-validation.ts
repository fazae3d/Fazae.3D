import { validateCoupon, type CouponValidationResult } from "./repositories/coupon-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCoupons } from "./demo-fallback";
import { formatPrice } from "@/lib/format";

/**
 * Same validation rules as validateCoupon(), replayed against the demo coupon
 * list so a coupon can still be applied (cart, checkout) with no database.
 * TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco.
 */
export async function validateCouponWithFallback(code: string, subtotal: number): Promise<CouponValidationResult> {
  const fallback: CouponValidationResult = (() => {
    const coupon = fallbackCoupons.find((c) => c.code.toLowerCase() === code.toLowerCase());
    if (!coupon || !coupon.active) return { valid: false, message: "Cupom inválido ou expirado." };
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, message: "Este cupom já atingiu o limite de uso." };
    }
    if (coupon.minSubtotal && subtotal < coupon.minSubtotal) {
      return { valid: false, message: `Este cupom exige um subtotal mínimo de ${formatPrice(coupon.minSubtotal)}.` };
    }
    return { valid: true, code: coupon.code, type: coupon.type, value: coupon.value };
  })();

  return withReadFallback(() => validateCoupon(code, subtotal), fallback);
}
