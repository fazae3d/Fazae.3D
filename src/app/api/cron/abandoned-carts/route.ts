import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { getEmailContactUrl, renderEmailLayout, renderOrderItemsTable, renderTotalHighlight } from "@/lib/email-template";
import { firstName, formatPrice } from "@/lib/format";
import { SITE_URL } from "@/lib/site-config";
import {
  getRemindableAbandonedCarts,
  isEmailOptedOut,
  markAbandonedCartReminded,
} from "@/server/repositories/abandoned-cart-repository";
import { createSignedToken } from "@/server/signed-token";
import { UNSUBSCRIBE_PURPOSE } from "@/lib/reminder-unsubscribe";

/** How long a cart sits untouched before it's considered abandoned. */
const ABANDONED_THRESHOLD_MS = 2 * 60 * 60 * 1000;

/**
 * Vercel Cron calls this on the schedule in vercel.json, sending
 * `Authorization: Bearer ${CRON_SECRET}` automatically once that env var is
 * set on the project — see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Em produção, sem CRON_SECRET a rota fica fechada (antes ficava aberta para qualquer um disparar e-mails).
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const carts = await getRemindableAbandonedCarts(new Date(Date.now() - ABANDONED_THRESHOLD_MS));
  const contactUrl = await getEmailContactUrl();

  let sent = 0;
  for (const cart of carts) {
    if (await isEmailOptedOut(cart.email)) {
      await markAbandonedCartReminded(cart.id);
      continue;
    }
    const unsubscribeUrl = `${SITE_URL}/cancelar-lembretes?token=${createSignedToken(UNSUBSCRIBE_PURPOSE, cart.email, null)}`;
    const greeting = cart.name ? `E aí, ${firstName(cart.name)}!` : "Oi, tudo bem?";
    const recoveryUrl = `${SITE_URL}/carrinho?recuperar=${cart.id}`;

    const result = await sendEmail({
      to: cart.email,
      subject: "Você esqueceu algo no carrinho!",
      html: renderEmailLayout({
        preheader: `Seu carrinho te espera · ${formatPrice(cart.subtotal)}`,
        eyebrow: "Carrinho",
        greeting,
        heading: "Ainda dá tempo de levar pra casa!",
        bodyHtml: `<p style="margin:0;">Reparamos que você deixou uns produtos bem legais no carrinho e não chegou a finalizar a compra. Guardamos tudo certinho pra você!</p>${renderOrderItemsTable(cart.items, formatPrice)}${renderTotalHighlight("Total:", formatPrice(cart.subtotal))}<p style="margin:20px 0 0;font-size:12px;color:#A6A6A0;">Não quer mais receber lembretes de carrinho? <a href="${unsubscribeUrl}" style="color:#A6A6A0;">Cancelar lembretes</a>.</p>`,
        action: { label: "Finalizar compra", url: recoveryUrl },
        contactUrl,
      }),
    });

    // Só marca como lembrado se o e-mail saiu; senão o próximo ciclo tenta de novo.
    if (result.success) {
      sent += 1;
      await markAbandonedCartReminded(cart.id);
    }
  }

  return NextResponse.json({ checked: carts.length, sent });
}
