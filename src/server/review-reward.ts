import { createHmac } from "crypto";
import { createCoupon, findCoupon } from "@/server/repositories/coupon-repository";
import { getStoreRules } from "@/server/store-rules";

/** Agradecimento por avaliar: desconto fixo em compras a partir de um mínimo, uso único (valores nas Regras da loja). Não depende da nota dada. */

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

/** Cria o cupom do pedido (se ainda não existir) e devolve o código. Valor 0 nas regras desliga a recompensa (devolve null). */
export async function ensureRewardCoupon(orderId: string): Promise<string | null> {
  const { reviews } = await getStoreRules({ fresh: true });
  if (reviews.rewardValue <= 0) return null;
  const code = rewardCodeFor(orderId);
  if (!(await findCoupon(code))) {
    await createCoupon({ code, type: "fixo", value: reviews.rewardValue, minSubtotal: reviews.rewardMinSubtotal, usageLimit: 1, active: true });
  }
  return code;
}
