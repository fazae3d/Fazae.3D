import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { updateOrderPaymentStatus } from "@/server/repositories/order-repository";
import { notifyOrderStatusChange } from "@/lib/order-notifications";
import type { OrderStatus } from "@/server/types";

function orderStatusForPayment(paymentStatus: string): OrderStatus {
  if (paymentStatus === "approved") return "Pagamento aprovado";
  if (paymentStatus === "rejected" || paymentStatus === "cancelled") return "Cancelado";
  return "Pedido recebido";
}

/**
 * Verifies the `x-signature` header per Mercado Pago's manifest scheme:
 * HMAC-SHA256("id:{data.id};request-id:{x-request-id};ts:{ts};", secret).
 * https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/your-integrations/notifications/webhooks#bookmark_verificando_a_origem_da_notifica%C3%A7%C3%A3o
 *
 * Returns "valid" | "invalid" | "unconfigured" — the caller decides how to
 * treat "unconfigured" (no MERCADOPAGO_WEBHOOK_SECRET set yet) separately
 * from an actually forged request, so a missing secret degrades instead of
 * silently breaking every Pix/boleto confirmation in production.
 */
function verifyWebhookSignature(request: NextRequest): "valid" | "invalid" | "unconfigured" {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return "unconfigured";

  const signatureHeader = request.headers.get("x-signature");
  const requestId = request.headers.get("x-request-id");
  const dataId = request.nextUrl.searchParams.get("data.id");
  if (!signatureHeader || !requestId || !dataId) return "invalid";

  const parts = new Map(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    }),
  );
  const ts = parts.get("ts");
  const receivedHash = parts.get("v1");
  if (!ts || !receivedHash) return "invalid";

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const expectedHash = createHmac("sha256", secret).update(manifest).digest("hex");

  const expected = Buffer.from(expectedHash, "utf8");
  const received = Buffer.from(receivedHash, "utf8");
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return "invalid";
  return "valid";
}

/**
 * Mercado Pago calls this whenever a payment's status changes — the only
 * way Pix/boleto ever move from "pending" to "approved", since those
 * happen well after the checkout page's own request has finished.
 */
export async function POST(request: NextRequest) {
  const signatureStatus = verifyWebhookSignature(request);
  if (signatureStatus === "invalid") {
    console.warn("[mercadopago webhook] assinatura x-signature inválida — requisição rejeitada");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  if (signatureStatus === "unconfigured") {
    // TODO: remove this branch once MERCADOPAGO_WEBHOOK_SECRET is set in prod —
    // até lá o webhook aceita a notificação sem verificar a origem, só reconsultando
    // o pagamento na API do MP (mitiga, mas não substitui validar a assinatura).
    console.warn("[mercadopago webhook] MERCADOPAGO_WEBHOOK_SECRET não configurado — pulando validação de assinatura");
  }

  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    body = null;
  }

  const payload = (body ?? {}) as { type?: string; data?: { id?: string } };
  const topic = payload.type ?? request.nextUrl.searchParams.get("topic");
  if (topic && topic !== "payment") {
    return NextResponse.json({ received: true });
  }

  const paymentId = payload.data?.id ?? request.nextUrl.searchParams.get("id") ?? request.nextUrl.searchParams.get("data.id");
  if (!paymentId) {
    return NextResponse.json({ received: true });
  }

  // Never trust the notification body's own status — always re-fetch from
  // Mercado Pago directly, exactly as their integration guide recommends.
  const payment = await getMercadoPagoPayment(String(paymentId));
  if (!payment.success) {
    console.error("[mercadopago webhook] falha ao consultar pagamento", paymentId, payment.error);
    return NextResponse.json({ received: true });
  }

  const result = await updateOrderPaymentStatus(payment.id, {
    paymentStatus: payment.status,
    status: orderStatusForPayment(payment.status),
  });
  if (!result.success) {
    console.warn("[mercadopago webhook] pedido não encontrado para pagamento", payment.id);
  } else {
    await notifyOrderStatusChange(result.order, result.previousStatus);
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
