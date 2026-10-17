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
    update: { name: input.name, items: input.items, subtotal: input.subtotal, remindedAt: null, reminderCount: 0 },
  });
  return toAbandonedCart(row);
}

export async function isEmailOptedOut(email: string): Promise<boolean> {
  return Boolean(await db.emailOptOut.findUnique({ where: { email: email.toLowerCase() } }));
}

/** Registra o pedido de "não quero mais lembretes" e apaga o carrinho guardado. */
export async function optOutOfReminders(email: string): Promise<void> {
  await db.emailOptOut.upsert({ where: { email: email.toLowerCase() }, create: { email: email.toLowerCase() }, update: {} });
  // Quem pede para parar também sai da lista de novidades (consentimento retirado).
  await db.subscriber.updateMany({ where: { email: { equals: email, mode: "insensitive" }, unsubscribedAt: null }, data: { unsubscribedAt: new Date() } });
  await db.abandonedCart.deleteMany({ where: { email: { equals: email, mode: "insensitive" } } });
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

/**
 * Carrinhos que merecem lembrete agora, ainda parados desde antes de `olderThan`:
 * 1º lembrete (nunca lembrado) e 2º lembrete (já recebeu um há `secondStageBefore` ou mais, e nada mudou desde então).
 */
export async function getRemindableAbandonedCarts(olderThan: Date, secondStageBefore: Date): Promise<AbandonedCart[]> {
  const rows = await db.abandonedCart.findMany({
    where: {
      updatedAt: { lt: olderThan },
      OR: [{ remindedAt: null }, { reminderCount: 1, remindedAt: { lt: secondStageBefore } }],
    },
  });
  return rows.map(toAbandonedCart);
}

export async function markAbandonedCartReminded(id: string): Promise<void> {
  await db.abandonedCart.update({ where: { id }, data: { remindedAt: new Date(), reminderCount: { increment: 1 } } });
}
