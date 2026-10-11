"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { fetchProductsForLines, resolveCartItems } from "@/lib/resolve-cart-items";
import { checkoutAddressSchema } from "@/lib/validation";
import { SHIPPING_OPTIONS, computeShippingCost } from "@/lib/shipping";
import { LOCAL_DELIVERY_LABEL, getLocalDeliveryRules, localDeliveryCost } from "@/lib/local-delivery";
import { isLocalDeliveryCep } from "@/server/local-delivery";
import { calculateShipping } from "@/lib/melhor-envio";
import { computeCouponDiscount } from "@/lib/coupons";
import { DEFAULT_PIX_DISCOUNT_PCT, resolveOrderDiscount, round2 } from "@/lib/money";
import {
  OutOfStockError,
  addOrder,
  discardUnpaidOrder,
  findOrdersByEmail,
  generateUniqueOrderId,
  recordPaymentOutcome,
} from "@/server/repositories/order-repository";
import { notifyOwner } from "@/lib/owner-notify";
import { LOW_STOCK_THRESHOLD } from "@/lib/badges";
import { registerCouponUsage } from "@/server/repositories/coupon-repository";
import { validateCouponWithFallback } from "@/server/coupon-validation";
import { getSettings } from "@/server/repositories/settings-repository";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { sendEmail } from "@/lib/email";
import { getEmailContactUrl, renderEmailLayout, renderOrderItemsTable, renderTotalHighlight } from "@/lib/email-template";
import { firstName, formatPrice } from "@/lib/format";
import { DEFAULT_WHATSAPP_NUMBER, SITE_URL } from "@/lib/site-config";
import { withReadFallback } from "@/lib/db-fallback";
import { createMercadoPagoPayment, mapPaymentTypeToMethod } from "@/lib/mercadopago";
import type { Order, OrderStatus } from "@/server/types";

const CHECKOUT_LIMIT = 15;
const CHECKOUT_WINDOW_MS = 10 * 60 * 1000;

const checkoutItemSchema = z.object({
  productSlug: z.string(),
  material: z.string(),
  color: z.string(),
  quantity: z.number().int().min(1).max(99),
  scale: z.string().max(30).optional(),
});

const shippingChoiceSchema = z.union([
  z.object({ kind: z.literal("local") }),
  z.object({ kind: z.literal("quote"), serviceId: z.number() }),
  z.object({ kind: z.literal("flat"), method: z.enum(["padrao", "expressa"]) }),
]);

const checkoutInputSchema = z.object({
  items: z.array(checkoutItemSchema).min(1).max(50),
  address: checkoutAddressSchema,
  shipping: shippingChoiceSchema,
  couponCode: z.string().optional(),
  guestEmail: z.string().email().optional(),
});

/** What the customer still needs to actually pay — present only for Pix/boleto, never for an already-approved card payment. */
export type PendingPaymentInstructions = { qrCode?: string; qrCodeBase64?: string; ticketUrl?: string };

export type CreateOrderResult =
  | { success: true; order: Order; paymentInstructions?: PendingPaymentInstructions }
  | { success: false; error: string };

/** A payment left "pending"/"in_process" by Mercado Pago (Pix, boleto, some cards) isn't a failure — the order is still created, awaiting the webhook to confirm it. */
function statusForPayment(paymentStatus: string): OrderStatus {
  return paymentStatus === "approved" ? "Pagamento aprovado" : "Pedido recebido";
}

/**
 * Prices, category names and shipping cost are all re-resolved server-side
 * from the product slugs rather than trusted from the client payload —
 * the checkout UI sends only slug/material/color/quantity plus the chosen
 * shipping method and coupon code.
 */
export async function processCheckoutPaymentAction(
  input: unknown,
  brickFormData: unknown,
): Promise<CreateOrderResult> {
  // Every call — success or failure — counts, so a script can't retry its
  // way past a declined card by hammering this action.
  const ip = await getClientIp();
  const limited = await rateLimit(`checkout:${ip}`, CHECKOUT_LIMIT, CHECKOUT_WINDOW_MS);
  if (!limited.allowed) {
    return { success: false, error: "Muitas tentativas de finalizar compra. Aguarde alguns minutos." };
  }

  const parsed = checkoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Dados de checkout inválidos." };
  }
  if (!brickFormData || typeof brickFormData !== "object") {
    return { success: false, error: "Dados de pagamento inválidos." };
  }
  const { items, address, shipping: shippingChoice, couponCode, guestEmail } = parsed.data;

  // Guests can check out with just an e-mail — no account required. When a
  // session exists it always wins, so a logged-in user can't be spoofed
  // into a guest order via a stale client-side guestEmail value.
  const session = await auth();
  const email = session?.user?.email ?? guestEmail;
  if (!email) {
    return { success: false, error: "Informe um e-mail para continuar." };
  }

  const productsBySlug = await fetchProductsForLines(items);
  const resolvedItems = await resolveCartItems(items, productsBySlug);

  if (resolvedItems.length === 0) {
    return { success: false, error: "Carrinho vazio ou produtos inválidos." };
  }

  // Stock is re-checked here too — the "Esgotado" state on the product
  // page is a UI courtesy, not the enforcement point.
  const wantedBySlug = new Map<string, number>();
  for (const item of resolvedItems) wantedBySlug.set(item.productSlug, (wantedBySlug.get(item.productSlug) ?? 0) + item.quantity);
  const outOfStockItem = resolvedItems.find((item) => {
    const product = productsBySlug.get(item.productSlug);
    if (!product) return true;
    if (product.type === "sob_encomenda") return false;
    return product.stock < (wantedBySlug.get(item.productSlug) ?? item.quantity);
  });
  if (outOfStockItem) {
    return {
      success: false,
      error: `"${outOfStockItem.name}" não tem estoque suficiente disponível.`,
    };
  }

  const subtotal = round2(resolvedItems.reduce((sum, item) => sum + item.price * item.quantity, 0));

  let discount = 0;
  let freeShippingFromCoupon = false;
  let appliedCouponCode: string | undefined;
  let couponIsPriceDiscount = false;

  if (couponCode) {
    const result = await validateCouponWithFallback(couponCode, subtotal);
    if (!result.valid) {
      return { success: false, error: `${result.message} Remova o cupom no resumo do pedido e tente de novo.` };
    }
    appliedCouponCode = result.code;
    if (result.type === "frete-gratis") {
      freeShippingFromCoupon = true;
    } else {
      // Cupom de desconto vale uma vez por cliente (ex.: "primeira compra"). Pedido cancelado não conta.
      const previousOrders = await findOrdersByEmail(email).catch(() => []);
      if (previousOrders.some((o) => o.couponCode === result.code && o.status !== "Cancelado")) {
        return { success: false, error: "Você já usou este cupom em outro pedido. Remova o cupom no resumo do pedido e tente de novo." };
      }
      discount = computeCouponDiscount(subtotal, result.type, result.value);
      couponIsPriceDiscount = true;
    }
  }

  const settings = await withReadFallback(
    () => getSettings({ fresh: true }),
    { freeShippingThreshold: 299.9, whatsappNumber: DEFAULT_WHATSAPP_NUMBER },
  );
  const { freeShippingThreshold, originCep } = settings;

  // Pix never stacks with a coupon — whichever discount is larger wins. When
  // Pix wins, the coupon isn't recorded as used (the customer didn't get it).
  const isPix = (brickFormData as Record<string, unknown>).payment_method_id === "pix";
  const orderDiscount = resolveOrderDiscount({
    subtotal,
    couponDiscount: discount,
    pixPct: settings.pixDiscountPct ?? DEFAULT_PIX_DISCOUNT_PCT,
    isPix,
  });
  discount = orderDiscount.discount;
  if (orderDiscount.pixWins && couponIsPriceDiscount) appliedCouponCode = undefined;

  // Never trust the price the client echoes back — only which service it
  // picked. A flat method is recomputed from the (subtotal, threshold) pure
  // function as before; a live quote is re-fetched from Melhor Envio and
  // only that service's own returned price is used.
  let shipping = 0;
  let shippingMethod: string;
  if (shippingChoice.kind === "local") {
    // Own-logistics delivery: re-verified here (city from the CEP, price from
    // the live settings) since the client only says "I picked this option".
    // Runs even with a free-shipping coupon, because the label tells the admin
    // this order goes out by motoboy, not by a carrier.
    if (!(await isLocalDeliveryCep(address.zip))) {
      return { success: false, error: "Entrega por motoboy indisponível para este pedido. Volte e escolha outra forma de entrega." };
    }
    shipping = freeShippingFromCoupon ? 0 : localDeliveryCost(subtotal, getLocalDeliveryRules(settings));
    shippingMethod = LOCAL_DELIVERY_LABEL;
  } else if (freeShippingFromCoupon) {
    shippingMethod = "Frete grátis (cupom)";
  } else {
    if (shippingChoice.kind === "flat") {
      shipping = computeShippingCost(shippingChoice.method, subtotal, freeShippingThreshold);
      shippingMethod = SHIPPING_OPTIONS.find((o) => o.key === shippingChoice.method)?.label ?? "Entrega";
    } else if (!originCep) {
      return { success: false, error: "Frete indisponível no momento. Volte e escolha a entrega novamente." };
    } else {
      const quoteResult = await calculateShipping({
        originCep,
        destinationCep: address.zip,
        items: items.map((line) => {
          const product = productsBySlug.get(line.productSlug);
          return {
            id: line.productSlug,
            weightGrams: product?.weightGrams ?? null,
            widthCm: product?.packageWidthCm ?? null,
            heightCm: product?.packageHeightCm ?? null,
            lengthCm: product?.packageLengthCm ?? null,
            unitPrice: product?.price ?? 0,
            quantity: line.quantity,
          };
        }),
      });
      const quote = quoteResult.success ? quoteResult.quotes.find((q) => q.id === shippingChoice.serviceId) : undefined;
      if (!quote) {
        return { success: false, error: "Frete indisponível no momento. Volte e escolha a entrega novamente." };
      }
      shipping = quote.price;
      shippingMethod = quote.company ? `${quote.name} (${quote.company})` : quote.name;
    }
  }
  const total = round2(Math.max(0, subtotal - discount) + shipping);

  const orderId = await generateUniqueOrderId();
  const brickData = brickFormData as Record<string, unknown>;
  const { phone, ...addressWithoutPhone } = address;
  const customerPhone = phone.replace(/\D/g, "");

  // O pedido é gravado ANTES de cobrar: assim todo pagamento aprovado tem um pedido correspondente, e a
  // baixa do estoque (atômica) acontece junto. Se algo falhar aqui, nada foi cobrado.
  const draft: Order = {
    id: orderId,
    createdAt: new Date().toISOString(),
    channel: "online",
    userEmail: email,
    customerName: address.recipient,
    customerPhone,
    items: resolvedItems,
    subtotal,
    shipping,
    shippingMethod,
    discount,
    couponCode: appliedCouponCode,
    total,
    paymentMethod: isPix ? "pix" : "cartao",
    paymentStatus: "pending",
    address: { ...addressWithoutPhone, id: `addr-${Date.now()}`, label: "Entrega" },
    status: "Pedido recebido",
  };

  try {
    await addOrder(draft, { reserveStock: true });
  } catch (error) {
    if (error instanceof OutOfStockError) return { success: false, error: error.message };
    console.error("[checkout] falha ao gravar o pedido antes do pagamento", error);
    return { success: false, error: "Não foi possível registrar o pedido agora. Nada foi cobrado, tente de novo em instantes." };
  }

  const paymentResult = await createMercadoPagoPayment({
    transactionAmount: total,
    description: `Pedido Fazaê ${orderId}`,
    externalReference: orderId,
    payerEmail: email,
    formData: brickData,
  });

  if (!paymentResult.success) {
    await discardUnpaidOrder(orderId).catch((error) => console.error("[checkout] falha ao desfazer pedido", orderId, error));
    return { success: false, error: paymentResult.error };
  }
  if (paymentResult.status === "rejected") {
    await discardUnpaidOrder(orderId).catch((error) => console.error("[checkout] falha ao desfazer pedido", orderId, error));
    return {
      success: false,
      error: "Pagamento recusado. Verifique os dados informados ou tente outro método de pagamento.",
    };
  }

  const orderStatus = statusForPayment(paymentResult.status);
  const outcome = {
    mpPaymentId: paymentResult.id,
    paymentStatus: paymentResult.status,
    status: orderStatus,
    paymentMethod: mapPaymentTypeToMethod(paymentResult.paymentTypeId),
  };
  const order: Order = { ...draft, ...outcome, paymentStatus: paymentResult.status as Order["paymentStatus"] };

  // O dinheiro já foi cobrado: se gravar o resultado falhar, tenta de novo e, em último caso, avisa o dono
  // (o webhook também reconcilia pelo código do pedido, então o pedido não se perde).
  let outcomeSaved = false;
  for (let attempt = 0; attempt < 3 && !outcomeSaved; attempt++) {
    try {
      await recordPaymentOutcome(orderId, outcome);
      outcomeSaved = true;
    } catch (error) {
      console.error("[checkout] falha ao registrar o resultado do pagamento", orderId, attempt + 1, error);
    }
  }
  if (!outcomeSaved) {
    await notifyOwner(`ATENÇÃO: pagamento sem vínculo no pedido ${orderId}`, [
      `O Mercado Pago cobrou o pagamento ${paymentResult.id} (status ${paymentResult.status}) para o pedido ${orderId}, mas não foi possível gravar o resultado no pedido.`,
      "O webhook deve reconciliar sozinho; se o pedido continuar como 'Pedido recebido', confira no Mercado Pago.",
    ]);
  }

  // Avisa o dono quando a venda deixa uma peça com pouco estoque (ou zerada).
  const lowStock = resolvedItems
    .map((item) => productsBySlug.get(item.productSlug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p) && p!.type !== "sob_encomenda")
    .map((p) => ({ name: p.name, left: p.stock - (wantedBySlug.get(p.slug) ?? 0) }))
    .filter((p) => p.left <= LOW_STOCK_THRESHOLD);
  if (lowStock.length > 0) {
    await notifyOwner(
      "Estoque baixo depois de uma venda",
      lowStock.map((p) => `${p.name}: ${p.left <= 0 ? "ZERADO" : `restam ${p.left}`}`),
    );
  }

  if (appliedCouponCode) {
    await registerCouponUsage(appliedCouponCode).catch((error) => console.error("[checkout] falha ao contar uso do cupom", error));
  }
  const savedOrder = order;

  await notifyOwner(`Novo pedido ${orderId}: R$ ${total.toFixed(2).replace(".", ",")}`, [
    `Pedido ${orderId} de ${address.recipient} (${email}, ${phone}).`,
    `Entrega: ${shippingMethod}. Pagamento: ${outcome.paymentMethod} (${paymentResult.status}).`,
    "Abra o painel para acompanhar.",
  ]);

  const introText =
    orderStatus === "Pagamento aprovado"
      ? "<p style=\"margin:0;\">Que alegria ter você por aqui! Seu pagamento já foi confirmado certinho e nosso time já tá de mãos na massa, preparando tudo com todo o carinho pra chegar aí do seu jeitinho.</p>"
      : "<p style=\"margin:0;\">Recebemos seu pedido certinho! Assim que o pagamento (Pix ou boleto) cair, a gente te conta por aqui, prometido.</p>";
  await sendEmail({
    to: email,
    subject: `Recebemos seu pedido ${savedOrder.id}!`,
    html: renderEmailLayout({
      preheader: `Pedido ${savedOrder.id} · ${formatPrice(total)}`,
      eyebrow: "Pedido confirmado",
      greeting: `E aí, ${firstName(address.recipient)}!`,
      heading: "Recebemos o seu pedido!",
      bodyHtml: `${introText}${renderOrderItemsTable(resolvedItems, formatPrice)}${renderTotalHighlight("Total:", formatPrice(total))}`,
      action: { label: "Acompanhar pedido", url: `${SITE_URL}/conta/pedidos` },
      contactUrl: await getEmailContactUrl(),
    }),
  });

  return {
    success: true,
    order: savedOrder,
    paymentInstructions:
      orderStatus === "Pagamento aprovado"
        ? undefined
        : {
            qrCode: paymentResult.qrCode,
            qrCodeBase64: paymentResult.qrCodeBase64,
            ticketUrl: paymentResult.ticketUrl,
          },
  };
}
