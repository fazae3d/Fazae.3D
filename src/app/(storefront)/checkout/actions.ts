"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { getProduct } from "@/lib/demo-data";
import { addressSchema } from "@/lib/validation";
import { computeShippingCost } from "@/lib/shipping";
import { computeCouponDiscount } from "@/lib/coupons";
import { round2 } from "@/lib/money";
import { addOrder, generateOrderId } from "@/server/repositories/order-repository";
import { registerCouponUsage } from "@/server/repositories/coupon-repository";
import { validateCouponWithFallback } from "@/server/coupon-validation";
import { getSettings } from "@/server/repositories/settings-repository";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { escapeHtml, sendEmail } from "@/lib/email";
import { formatPrice } from "@/lib/format";
import { DEFAULT_WHATSAPP_NUMBER, SITE_URL } from "@/lib/site-config";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackProducts } from "@/server/demo-fallback";
import { createMercadoPagoPayment, mapPaymentTypeToMethod } from "@/lib/mercadopago";
import type { Order, OrderStatus } from "@/server/types";

const CHECKOUT_LIMIT = 15;
const CHECKOUT_WINDOW_MS = 10 * 60 * 1000;

const checkoutItemSchema = z.object({
  productSlug: z.string(),
  material: z.string(),
  color: z.string(),
  quantity: z.number().int().min(1),
});

const checkoutInputSchema = z.object({
  items: z.array(checkoutItemSchema).min(1),
  address: addressSchema,
  shippingMethod: z.enum(["padrao", "expressa"]),
  couponCode: z.string().optional(),
  guestEmail: z.string().email().optional(),
});

export type CreateOrderResult = { success: true; order: Order } | { success: false; error: string };

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
  const limited = rateLimit(`checkout:${ip}`, CHECKOUT_LIMIT, CHECKOUT_WINDOW_MS);
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
  const { items, address, shippingMethod, couponCode, guestEmail } = parsed.data;

  // Guests can check out with just an e-mail — no account required. When a
  // session exists it always wins, so a logged-in user can't be spoofed
  // into a guest order via a stale client-side guestEmail value.
  const session = await auth();
  const email = session?.user?.email ?? guestEmail;
  if (!email) {
    return { success: false, error: "Informe um e-mail para continuar." };
  }

  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco — hoje a leitura real falharia sem Supabase configurado.
  const productsBySlug = new Map(
    (
      await Promise.all(
        items.map((line) =>
          withReadFallback(
            () => getProduct(line.productSlug),
            fallbackProducts.find((p) => p.slug === line.productSlug),
          ),
        ),
      )
    )
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => [p.slug, p] as const),
  );

  const resolvedItems = items
    .map((line) => {
      const product = productsBySlug.get(line.productSlug);
      // A product with no fixed price ("sob consulta") isn't sellable through
      // checkout — it's dropped here the same way a discontinued product is.
      if (!product || product.price === undefined) return null;
      return {
        productSlug: product.slug,
        name: product.name,
        categoryName: product.categoryName,
        material: line.material,
        color: line.color,
        quantity: line.quantity,
        price: product.price,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (resolvedItems.length === 0) {
    return { success: false, error: "Carrinho vazio ou produtos inválidos." };
  }

  // Stock is re-checked here too — the "Esgotado" state on the product
  // page is a UI courtesy, not the enforcement point.
  const outOfStockItem = resolvedItems.find((item) => {
    const product = productsBySlug.get(item.productSlug);
    return !product || product.stock < item.quantity;
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

  if (couponCode) {
    const result = await validateCouponWithFallback(couponCode, subtotal);
    if (result.valid) {
      appliedCouponCode = result.code;
      if (result.type === "frete-gratis") {
        freeShippingFromCoupon = true;
      } else {
        discount = computeCouponDiscount(subtotal, result.type, result.value);
      }
    }
  }

  const { freeShippingThreshold } = await withReadFallback(
    () => getSettings(),
    { freeShippingThreshold: 299.9, whatsappNumber: DEFAULT_WHATSAPP_NUMBER },
  );
  const shipping = freeShippingFromCoupon ? 0 : computeShippingCost(shippingMethod, subtotal, freeShippingThreshold);
  const total = round2(Math.max(0, subtotal - discount) + shipping);

  // Order id is generated up front (a pure/local helper, no DB write) so it
  // can be sent to Mercado Pago as the external_reference before the order
  // itself exists — the webhook and this id then always agree.
  const orderId = generateOrderId();

  const paymentResult = await createMercadoPagoPayment({
    transactionAmount: total,
    description: `Pedido Fazaê ${orderId}`,
    externalReference: orderId,
    payerEmail: email,
    formData: brickFormData as Record<string, unknown>,
  });

  if (!paymentResult.success) {
    return { success: false, error: paymentResult.error };
  }
  if (paymentResult.status === "rejected") {
    return {
      success: false,
      error: "Pagamento recusado. Verifique os dados informados ou tente outro método de pagamento.",
    };
  }

  const orderStatus = statusForPayment(paymentResult.status);
  const order: Order = {
    id: orderId,
    createdAt: new Date().toISOString(),
    channel: "online",
    userEmail: email,
    items: resolvedItems,
    subtotal,
    shipping,
    discount,
    couponCode: appliedCouponCode,
    total,
    paymentMethod: mapPaymentTypeToMethod(paymentResult.paymentTypeId),
    paymentStatus: paymentResult.status as Order["paymentStatus"],
    mpPaymentId: paymentResult.id,
    address: { ...address, id: `addr-${Date.now()}`, label: "Entrega" },
    status: orderStatus,
  };

  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco — sem Supabase, o pedido não é
  // persistido, mas o checkout ainda é concluído e a confirmação é exibida normalmente.
  const savedOrder = await withReadFallback(() => addOrder(order), order);
  if (appliedCouponCode) await withReadFallback(() => registerCouponUsage(appliedCouponCode), undefined);

  const itemsHtml = resolvedItems
    .map(
      (item) =>
        `<li>${item.quantity}x ${escapeHtml(item.name)} (${escapeHtml(item.material)}, ${escapeHtml(item.color)}) · ${formatPrice(item.price * item.quantity)}</li>`,
    )
    .join("");
  const statusLine =
    orderStatus === "Pagamento aprovado"
      ? "<p>Seu pedido foi confirmado e o pagamento aprovado!</p>"
      : "<p>Recebemos seu pedido. Assim que o pagamento for confirmado (Pix/boleto), você recebe uma nova notificação.</p>";
  await sendEmail({
    to: email,
    subject: `Fazaê: pedido ${savedOrder.id} recebido`,
    html: `${statusLine}<ul>${itemsHtml}</ul><p><strong>Total: ${formatPrice(total)}</strong></p><p>Acompanhe o status em ${SITE_URL}/conta/pedidos</p>`,
  });

  return { success: true, order: savedOrder };
}
