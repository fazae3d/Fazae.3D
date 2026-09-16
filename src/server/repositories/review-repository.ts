import { db } from "../db";
import type { Review, ReviewStats } from "../types";
import type { Prisma } from "@/generated/prisma/client";

export type { Review, ReviewStats } from "../types";

type ReviewRow = Prisma.ReviewGetPayload<object>;

function toReview(row: ReviewRow): Review {
  return {
    id: row.id,
    productSlug: row.productSlug,
    orderId: row.orderId,
    authorName: row.authorName,
    rating: row.rating,
    text: row.text ?? undefined,
    hidden: row.hidden,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Published (non-hidden) reviews for a product, newest first. */
export async function getPublishedReviews(productSlug: string): Promise<Review[]> {
  const rows = await db.review.findMany({
    where: { productSlug, hidden: false },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toReview);
}

export async function getReviewStats(productSlug: string): Promise<ReviewStats> {
  const result = await db.review.aggregate({
    where: { productSlug, hidden: false },
    _avg: { rating: true },
    _count: true,
  });
  return {
    average: result._avg.rating ?? 0,
    count: result._count,
  };
}

/** Used to tell a "already reviewed" state apart from a fresh form — regardless of hidden. */
export async function getReviewForOrderProduct(orderId: string, productSlug: string): Promise<Review | undefined> {
  const row = await db.review.findUnique({ where: { orderId_productSlug: { orderId, productSlug } } });
  return row ? toReview(row) : undefined;
}

export type CreateReviewInput = {
  productSlug: string;
  orderId: string;
  authorName: string;
  rating: number;
  text?: string;
};

export type CreateReviewResult = { success: true; review: Review } | { success: false; error: string };

export async function createReview(input: CreateReviewInput): Promise<CreateReviewResult> {
  try {
    const created = await db.review.create({
      data: {
        productSlug: input.productSlug,
        orderId: input.orderId,
        authorName: input.authorName,
        rating: input.rating,
        text: input.text,
      },
    });
    return { success: true, review: toReview(created) };
  } catch (error) {
    // Unique constraint on (orderId, productSlug) — the customer already reviewed this item.
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return { success: false, error: "Você já avaliou este produto." };
    }
    throw error;
  }
}

export async function getAllReviewsForAdmin(): Promise<Review[]> {
  const rows = await db.review.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toReview);
}

export async function setReviewHidden(id: string, hidden: boolean): Promise<void> {
  await db.review.update({ where: { id }, data: { hidden } });
}

export async function deleteReview(id: string): Promise<void> {
  await db.review.delete({ where: { id } });
}
