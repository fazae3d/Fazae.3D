"use server";

import { auth } from "@/auth";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { findOrderById } from "@/server/repositories/order-repository";
import { isEmailVerified } from "@/server/repositories/user-repository";
import type { OrderItem, OrderStatus } from "@/server/types";

/** O que o rastreamento mostra ao cliente: sem CPF, endereço, e-mail ou ids do pagamento. */
export type PublicOrder = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  total: number;
  tracking?: string;
  items: OrderItem[];
};

export type TrackOrderResult = { found: true; order: PublicOrder } | { found: false; rateLimited?: boolean };

const TRACK_LIMIT = 15;
const TRACK_WINDOW_MS = 10 * 60 * 1000;

/**
 * Logged-in users (with a confirmed e-mail) are authorized by session alone. Guests (no session
 * checkout doesn't require an account) must additionally provide the e-mail the order was placed
 * with, since there's no other credential to check against. Limited per IP so the order code +
 * e-mail pair can't be brute-forced.
 */
export async function trackOrderAction(orderId: string, email?: string): Promise<TrackOrderResult> {
  const ip = await getClientIp();
  const limited = await rateLimit(`track:${ip}`, TRACK_LIMIT, TRACK_WINDOW_MS);
  if (!limited.allowed) return { found: false, rateLimited: true };

  const order = await findOrderById(orderId.trim().toUpperCase());
  if (!order) return { found: false };

  const session = await auth();
  const sessionEmail = session?.user?.email?.toLowerCase();
  const providedEmail = email?.trim().toLowerCase();
  const orderEmail = order.userEmail?.toLowerCase();

  // A manual (in-person/WhatsApp) sale has no e-mail on file, so it can
  // never be matched here, there's no credential a guest or session could
  // supply to prove ownership of it.
  const sessionOwns = Boolean(sessionEmail) && sessionEmail === orderEmail && (await isEmailVerified(sessionEmail!));
  const authorized = Boolean(orderEmail) && (sessionOwns || providedEmail === orderEmail);
  if (!authorized) return { found: false };

  return {
    found: true,
    order: {
      id: order.id,
      createdAt: order.createdAt,
      status: order.status,
      total: order.total,
      tracking: order.tracking,
      items: order.items,
    },
  };
}
