"use server";

import { z } from "zod";
import { resolveCartItems, type CartItemLine } from "@/lib/resolve-cart-items";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import {
  deleteAbandonedCart,
  getAbandonedCart,
  upsertAbandonedCart,
} from "@/server/repositories/abandoned-cart-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { round2 } from "@/lib/money";

const CAPTURE_LIMIT = 20;
const CAPTURE_WINDOW_MS = 10 * 60 * 1000;

const cartLineSchema = z.object({
  productSlug: z.string(),
  material: z.string(),
  color: z.string(),
  quantity: z.number().int().min(1),
});

const captureSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  lines: z.array(cartLineSchema).min(1),
});

/**
 * Fire-and-forget from the checkout page once the customer's e-mail is
 * known (right after the identification step) — never awaited for its
 * result in the UI, so a failure here must never block checkout itself.
 */
export async function captureAbandonedCartAction(input: unknown): Promise<void> {
  const ip = await getClientIp();
  const limited = rateLimit(`abandoned-cart-capture:${ip}`, CAPTURE_LIMIT, CAPTURE_WINDOW_MS);
  if (!limited.allowed) return;

  const parsed = captureSchema.safeParse(input);
  if (!parsed.success) return;

  const items = await resolveCartItems(parsed.data.lines as CartItemLine[]);
  if (items.length === 0) return;

  const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));

  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  try {
    await upsertAbandonedCart({ email: parsed.data.email, name: parsed.data.name, items, subtotal });
  } catch {
    // Best-effort — never surfaces to the checkout UI, which doesn't await this action.
  }
}

/** Called right when a checkout succeeds — the cart that was just bought is no longer "abandoned". */
export async function clearAbandonedCartAction(email: string): Promise<void> {
  if (!email) return;
  try {
    await deleteAbandonedCart(email);
  } catch {
    // Best-effort — never surfaces to the checkout UI, which doesn't await this action.
  }
}

export type AbandonedCartLine = { productSlug: string; material: string; color: string; quantity: number };

/**
 * Powers the e-mail's recovery link (`/carrinho?recuperar=<id>`) — reads by
 * id only, no ownership check, since the id itself (a cuid, unguessable) is
 * the link's only secret, same trust model as a password-reset token.
 */
export async function getAbandonedCartLinesAction(id: string): Promise<AbandonedCartLine[]> {
  const cart = await withReadFallback(() => getAbandonedCart(id), undefined);
  if (!cart) return [];
  return cart.items.map((item) => ({
    productSlug: item.productSlug,
    material: item.material,
    color: item.color,
    quantity: item.quantity,
  }));
}
