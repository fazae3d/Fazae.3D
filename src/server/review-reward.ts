import { createHmac } from "crypto";
import { createCoupon, findCoupon } from "@/server/repositories/coupon-repository";

/** Agradecimento por avaliar: R$ 5 de desconto em compras a partir de R$ 30, uso único. Não depende da nota dada. */
export const REVIEW_REWARD_VALUE = 5;
export const REVIEW_REWARD_MIN_SUBTOTAL = 30;

function secret() {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET não configurado.");
  return value;
}

/** Código fixo por pedido (sempre o mesmo para o mesmo pedido): quem recarrega a página não ganha outro cupom. */
export function rewardCodeFor(orderId: string) {
  const digest = createHmac("sha256", secret()).update(`review-reward:${orderId}`).digest("hex");
  return `OBRIGADO-${digest.slice(0, 6).toUpperCase()}`;
}

/** Cria o cupom do pedido (se ainda não existir) e devolve o código. */
export async function ensureRewardCoupon(orderId: string): Promise<string> {
  const code = rewardCodeFor(orderId);
  if (!(await findCoupon(code))) {
    await createCoupon({ code, type: "fixo", value: REVIEW_REWARD_VALUE, minSubtotal: REVIEW_REWARD_MIN_SUBTOTAL, usageLimit: 1, active: true });
  }
  return code;
}
