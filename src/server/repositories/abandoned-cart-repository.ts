import { db } from "../db";
import type { AbandonedCart } from "../types";
import type { Prisma } from "@/generated/prisma/client";

type AbandonedCartRow = Prisma.AbandonedCartGetPayload<object>;

function toAbandonedCart(row: AbandonedCartRow): AbandonedCart {
  return {
    ...row,
    name: row.name ?? undefined,
    items: row.items as AbandonedCart["items"],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    remindedAt: row.remindedAt?.toISOString() ?? undefined,
  };
}

export type UpsertAbandonedCartInput = {
  email: string;
  name?: string;
  items: AbandonedCart["items"];
  subtotal: number;
};

/** Overwrites any previous snapshot for this e-mail and clears remindedAt — a fresh abandonment is reminder-eligible again. */
export async function upsertAbandonedCart(input: UpsertAbandonedCartInput): Promise<AbandonedCart> {
  const row = await db.abandonedCart.upsert({
    where: { email: input.email },
    create: { email: input.email, name: input.name, items: input.items, subtotal: input.subtotal },
    update: { name: input.name, items: input.items, subtotal: input.subtotal, remindedAt: null },
  });
  return toAbandonedCart(row);
}

/** No-ops when there's nothing to clear — called on every successful checkout, most of which never had a snapshot. */
export async function deleteAbandonedCart(email: string): Promise<void> {
  await db.abandonedCart.deleteMany({ where: { email } });
}

export async function getAbandonedCart(id: string): Promise<AbandonedCart | undefined> {
  if (!id) return undefined;
  const row = await db.abandonedCart.findUnique({ where: { id } });
  return row ? toAbandonedCart(row) : undefined;
}

/** Carts worth reminding right now: never reminded, and untouched since before `olderThan`. */
export async function getRemindableAbandonedCarts(olderThan: Date): Promise<AbandonedCart[]> {
  const rows = await db.abandonedCart.findMany({
    where: { remindedAt: null, updatedAt: { lt: olderThan } },
  });
  return rows.map(toAbandonedCart);
}

export async function markAbandonedCartReminded(id: string): Promise<void> {
  await db.abandonedCart.update({ where: { id }, data: { remindedAt: new Date() } });
}
