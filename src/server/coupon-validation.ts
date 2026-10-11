import { validateCoupon, type CouponValidationResult } from "./repositories/coupon-repository";

/**
 * Valida o cupom no banco. Se o banco falhar, o cupom é recusado: antes, a falha caía numa
 * lista de cupons de demonstração e o checkout podia aplicar desconto que não existe de verdade.
 */
export async function validateCouponWithFallback(code: string, subtotal: number): Promise<CouponValidationResult> {
  try {
    return await validateCoupon(code, subtotal);
  } catch (error) {
    console.error("[cupom] falha ao validar cupom", error);
    return { valid: false, message: "Não foi possível validar o cupom agora. Tente de novo em instantes." };
  }
}
