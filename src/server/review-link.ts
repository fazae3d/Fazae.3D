import { SITE_URL } from "@/lib/site-config";
import { createSignedToken, readSignedToken } from "@/server/signed-token";

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

const purposeFor = (orderId: string) => `review:${orderId}`;

/** Link para avaliar um pedido entregue SEM precisar de conta: o token assinado (válido por 90 dias) prova que a pessoa recebeu o link. */
export function createReviewUrl(order: { id: string; userEmail?: string }) {
  const token = createSignedToken(purposeFor(order.id), order.userEmail ?? "sem-email", NINETY_DAYS_MS);
  return `${SITE_URL}/avaliar/${encodeURIComponent(order.id)}?t=${token}`;
}

export function isValidReviewToken(orderId: string, token: string | undefined, orderEmail?: string) {
  if (!token) return false;
  const data = readSignedToken(token, purposeFor(orderId));
  return Boolean(data) && data!.email === (orderEmail ?? "sem-email").toLowerCase();
}
