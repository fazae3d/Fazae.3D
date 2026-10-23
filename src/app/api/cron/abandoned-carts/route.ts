import { NextRequest, NextResponse } from "next/server";
import { escapeHtml, sendEmail } from "@/lib/email";
import { getEmailContactUrl, renderEmailLayout, renderOrderItemsTable, renderTotalHighlight } from "@/lib/email-template";
import { firstName, formatPrice } from "@/lib/format";
import { getPendingPaymentInstructions } from "@/lib/mercadopago";
import { SITE_URL } from "@/lib/site-config";
import {
  getRemindableAbandonedCarts,
  isEmailOptedOut,
  markAbandonedCartReminded,
} from "@/server/repositories/abandoned-cart-repository";
import { findCoupon } from "@/server/repositories/coupon-repository";
import { findPixOrdersAwaitingReminder, markPixReminderSent } from "@/server/repositories/order-repository";
import { getProduct } from "@/server/repositories/product-repository";
import { createSignedToken } from "@/server/signed-token";
import { notifyPixWhatsApp } from "@/server/whatsapp/automation";
import { UNSUBSCRIBE_PURPOSE } from "@/lib/reminder-unsubscribe";
import { getStoreRules } from "@/server/store-rules";


/**
 * Vercel Cron calls this on the schedule in vercel.json, sending
 * `Authorization: Bearer ${CRON_SECRET}` automatically once that env var is
 * set on the project, see https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  // Em produção, sem CRON_SECRET a rota fica fechada (antes ficava aberta para qualquer um disparar e-mails).
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/** Cupom oferecido no 2º lembrete: o de boas-vindas das Regras da loja (só se existir e estiver ativo em Cupons). */
async function activeCouponCode(code: string): Promise<string | null> {
  if (!code) return null;
  try {
    const coupon = await findCoupon(code);
    if (!coupon || !coupon.active) return null;
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) return null;
    return coupon.code;
  } catch {
    return null;
  }
}

/** Nomes dos itens com poucas unidades de verdade (até o limite do selo "Últimas peças", só peça pronta): escassez honesta. */
async function lowStockNames(items: { productSlug: string; name: string }[], scarcityThreshold: number): Promise<string[]> {
  const names: string[] = [];
  for (const item of items) {
    try {
      const product = await getProduct(item.productSlug);
      if (product && product.type !== "sob_encomenda" && product.stock > 0 && product.stock <= scarcityThreshold) names.push(item.name);
    } catch {
      // sem a informação de estoque, simplesmente não mostra o aviso
    }
  }
  return names;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const rules = await getStoreRules({ fresh: true });
  const now = Date.now();
  // Quanto tempo um carrinho fica parado até contar como abandonado, e quando sai o 2º lembrete (com incentivo).
  const abandonedAfterMs = rules.automation.abandonedCartHours * 60 * 60 * 1000;
  const secondReminderAfterMs = rules.automation.abandonedCartSecondDays * 24 * 60 * 60 * 1000;
  const carts = await getRemindableAbandonedCarts(new Date(now - abandonedAfterMs), new Date(now - secondReminderAfterMs));
  const contactUrl = await getEmailContactUrl();
  const couponCode = await activeCouponCode(rules.payments.welcomeCouponCode);

  let sent = 0;
  for (const cart of carts) {
    if (await isEmailOptedOut(cart.email)) {
      await markAbandonedCartReminded(cart.id);
      continue;
    }
    const second = (cart.reminderCount ?? 0) >= 1;
    const unsubscribeUrl = `${SITE_URL}/cancelar-lembretes?token=${createSignedToken(UNSUBSCRIBE_PURPOSE, cart.email, null)}`;
    const greeting = cart.name ? `E aí, ${firstName(cart.name)}!` : "Oi, tudo bem?";
    const recoveryUrl = `${SITE_URL}/carrinho?recuperar=${cart.id}`;
    const firstItem = cart.items[0]?.name ?? "seu carrinho";
    const shortName = firstItem.length > 48 ? `${firstItem.slice(0, 45)}...` : firstItem;

    const low = second ? await lowStockNames(cart.items, rules.storefront.scarcityThreshold) : [];
    const lowLine = low.length
      ? `<p style="margin:14px 0 0;font-weight:bold;">Restam poucas unidades de ${escapeHtml(low.join(", "))}.</p>`
      : "";
    const couponLine =
      second && couponCode
        ? `<p style="margin:14px 0 0;padding:12px 14px;background:#f1ffd0;border-left:4px solid #b6ff00;">Para fechar de vez, use o cupom <strong>${escapeHtml(couponCode)}</strong> no carrinho.</p>`
        : "";

    const result = await sendEmail({
      to: cart.email,
      subject: second
        ? couponCode
          ? `${shortName}: seu cupom ${couponCode} está esperando`
          : `Ainda dá tempo: ${shortName} continua no seu carrinho`
        : `${shortName}: seu carrinho te espera`,
      html: renderEmailLayout({
        preheader: `Seu carrinho te espera · ${formatPrice(cart.subtotal)}`,
        eyebrow: "Carrinho",
        greeting,
        heading: second ? "Seu carrinho ainda está guardado" : "Ainda dá tempo de levar pra casa!",
        bodyHtml: `<p style="margin:0;">${
          second
            ? "Passando só para avisar que guardamos tudo certinho para você. Se ficou alguma dúvida (cor, prazo, frete), é só responder este e-mail ou chamar no WhatsApp."
            : "Reparamos que você deixou uns produtos bem legais no carrinho e não chegou a finalizar a compra. Guardamos tudo certinho pra você!"
        }</p>${renderOrderItemsTable(cart.items, formatPrice)}${renderTotalHighlight("Total:", formatPrice(cart.subtotal))}${lowLine}${couponLine}<p style="margin:20px 0 0;font-size:12px;color:#A6A6A0;">Não quer mais receber lembretes de carrinho? <a href="${unsubscribeUrl}" style="color:#A6A6A0;">Cancelar lembretes</a>.</p>`,
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

  // Lembrete de Pix: o abandono mais "quente" (a pessoa já escolheu e gerou o código). Um só por pedido.
  let pixSent = 0;
  const pixOrders = await findPixOrdersAwaitingReminder(new Date(now - 30 * 60 * 60 * 1000), new Date(now - 6 * 60 * 60 * 1000));
  for (const order of pixOrders) {
    const instructions = order.mpPaymentId ? await getPendingPaymentInstructions(order.mpPaymentId) : null;
    // Se o WhatsApp de avisos estiver ligado e o aviso sair por lá, o e-mail não repete.
    if (instructions?.qrCode && (await notifyPixWhatsApp(order, instructions.qrCode))) {
      pixSent += 1;
      await markPixReminderSent(order.id);
      continue;
    }
    // Sem código (já pago, vencido ou erro do Mercado Pago): não incomoda a pessoa.
    if (!instructions?.qrCode || !order.userEmail || (await isEmailOptedOut(order.userEmail))) {
      await markPixReminderSent(order.id);
      continue;
    }
    const name = firstName(order.customerName ?? order.address?.recipient ?? "Cliente Fazaê");
    const result = await sendEmail({
      to: order.userEmail,
      subject: `Seu Pix do pedido ${order.id} vence hoje`,
      html: renderEmailLayout({
        preheader: `Pague agora e garantimos o seu pedido · ${formatPrice(order.total)}`,
        eyebrow: "Pix",
        greeting: `Oi, ${name}!`,
        heading: "Seu Pix está esperando",
        bodyHtml: `<p style="margin:0 0 12px;">O pagamento do pedido <strong>${escapeHtml(order.id)}</strong> ainda não apareceu por aqui e o Pix vence hoje. Seu pedido está reservado, é só pagar para a gente começar a preparar.</p>${renderTotalHighlight("Total no Pix:", formatPrice(order.total))}<p style="margin:16px 0 6px;font-size:13px;">Pix copia e cola:</p><div style="background:#FAFAF8;border-radius:8px;padding:12px;font-family:monospace;font-size:12px;word-break:break-all;color:#111111;">${escapeHtml(instructions.qrCode)}</div><p style="margin:14px 0 0;font-size:13px;">Se o código não funcionar, responda este e-mail ou chame a gente no WhatsApp.</p>`,
        action: { label: "Ver meu pedido", url: `${SITE_URL}/conta/pedidos` },
        contactUrl,
      }),
    });
    if (result.success) {
      pixSent += 1;
      await markPixReminderSent(order.id);
    }
  }

  return NextResponse.json({ checked: carts.length, sent, pixChecked: pixOrders.length, pixSent });
}
