"use server";

import { auth } from "@/auth";
import { findOrderById } from "@/server/repositories/order-repository";
import { createReview, getReviewForOrderProduct } from "@/server/repositories/review-repository";
import { withReadFallback, withMutationFallback } from "@/lib/db-fallback";
import type { Review } from "@/server/types";

/** First name only — never the full name — for a public-facing review author. */
function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

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
  const authorized = Boolean(orderEmail) && (sessionEmail === orderEmail || providedEmail === orderEmail);
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
