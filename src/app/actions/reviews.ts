"use server";

import { auth } from "@/auth";
import { findOrderById } from "@/server/repositories/order-repository";
import { createReview, getReviewForOrderProduct } from "@/server/repositories/review-repository";
import { withReadFallback, withMutationFallback } from "@/lib/db-fallback";
import { firstName } from "@/lib/format";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { isEmailVerified } from "@/server/repositories/user-repository";
import { isValidReviewToken } from "@/server/review-link";
import type { Review } from "@/server/types";

export type SubmitReviewResult = { success: true; review: Review } | { success: false; error: string };

/**
 * Same "prove you own this order" pattern as trackOrderAction: logged-in
 * users are authorized by session, guests must supply the e-mail the order
 * was placed with. On top of that, review submission additionally requires
 * the order to actually contain this product and be marked "Entregue" —
 * that's the whole point of a verified-purchase review.
 */
export async function submitReviewAction(input: {
  orderId: string;
  productSlug: string;
  rating: number;
  text?: string;
  guestEmail?: string;
}): Promise<SubmitReviewResult> {
  const { orderId, productSlug, rating, text, guestEmail } = input;

  const limited = await rateLimit(`review:${await getClientIp()}`, 10, 10 * 60 * 1000);
  if (!limited.allowed) return { success: false, error: "Muitas tentativas. Aguarde alguns minutos." };
  if (text && text.length > 2000) return { success: false, error: "O comentário pode ter até 2000 caracteres." };

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { success: false, error: "Selecione uma nota de 1 a 5." };
  }

  const order = await withReadFallback(() => findOrderById(orderId.trim()), undefined);
  if (!order) {
    return { success: false, error: "Pedido não encontrado." };
  }

  const session = await auth();
  const sessionEmail = session?.user?.email?.toLowerCase();
  const providedEmail = guestEmail?.trim().toLowerCase();
  const orderEmail = order.userEmail?.toLowerCase();
  const sessionOwns = Boolean(sessionEmail) && sessionEmail === orderEmail && (await isEmailVerified(sessionEmail!));
  const authorized = Boolean(orderEmail) && (sessionOwns || providedEmail === orderEmail);
  if (!authorized) {
    return { success: false, error: "Não foi possível confirmar esse pedido." };
  }

  if (order.status !== "Entregue") {
    return { success: false, error: "Só é possível avaliar depois que o pedido for entregue." };
  }
  if (!order.items.some((item) => item.productSlug === productSlug)) {
    return { success: false, error: "Esse produto não faz parte desse pedido." };
  }

  const authorName = firstName(order.customerName ?? order.address?.recipient ?? "Cliente Fazaê");

  const result = await withMutationFallback(() =>
    createReview({
      productSlug,
      orderId: order.id,
      authorName,
      rating,
      text: text?.trim() || undefined,
    }),
  );
  return result;
}

/**
 * Read-only — no e-mail check. Whoever renders the CTA that calls this
 * already proved ownership of the order (via trackOrderAction or a logged-in
 * session) before this component ever mounted.
 */
export async function getMyReviewAction(orderId: string, productSlug: string): Promise<Review | undefined> {
  return withReadFallback(() => getReviewForOrderProduct(orderId, productSlug), undefined);
}

/**
 * Avaliação pelo link do e-mail/WhatsApp (sem login). O token assinado no link prova que a pessoa recebeu o pedido;
 * o resto das regras (pedido entregue, produto do pedido, uma avaliação por produto) é o mesmo da avaliação normal.
 */
export async function submitMagicReviewAction(input: {
  orderId: string;
  token: string;
  productSlug: string;
  rating: number;
  text?: string;
}): Promise<SubmitReviewResult> {
  const { orderId, token, productSlug, rating, text } = input;

  const limited = await rateLimit(`review:${await getClientIp()}`, 15, 10 * 60 * 1000);
  if (!limited.allowed) return { success: false, error: "Muitas tentativas. Aguarde alguns minutos." };
  if (text && text.length > 2000) return { success: false, error: "O comentário pode ter até 2000 caracteres." };
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { success: false, error: "Selecione uma nota de 1 a 5." };

  const order = await withReadFallback(() => findOrderById(orderId.trim()), undefined);
  if (!order || !isValidReviewToken(order.id, token, order.userEmail)) {
    return { success: false, error: "Link inválido ou expirado." };
  }
  if (order.status !== "Entregue") return { success: false, error: "Só é possível avaliar depois que o pedido for entregue." };
  if (!order.items.some((item) => item.productSlug === productSlug)) return { success: false, error: "Esse produto não faz parte desse pedido." };

  const authorName = firstName(order.customerName ?? order.address?.recipient ?? "Cliente Fazaê");
  return withMutationFallback(() =>
    createReview({ productSlug, orderId: order.id, authorName, rating, text: text?.trim() || undefined }),
  );
}
