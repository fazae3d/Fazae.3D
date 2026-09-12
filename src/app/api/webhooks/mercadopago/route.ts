import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { updateOrderPaymentStatus } from "@/server/repositories/order-repository";
import type { OrderStatus } from "@/server/types";

function orderStatusForPayment(paymentStatus: string): OrderStatus {
  if (paymentStatus === "approved") return "Pagamento aprovado";
  if (paymentStatus === "rejected" || paymentStatus === "cancelled") return "Cancelado";
  return "Pedido recebido";
}

/**
 * Mercado Pago calls this whenever a payment's status changes — the only
 * way Pix/boleto ever move from "pending" to "approved", since those
 * happen well after the checkout page's own request has finished.
 *
 * TODO: once a webhook secret is configured in the Mercado Pago panel
 * (Notificações > Webhooks), validate the `x-signature` header before
 * trusting the payload — see https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/your-integrations/notifications/webhooks#bookmark_verificando_a_origem_da_notifica%C3%A7%C3%A3o
 */
export async function POST(request: NextRequest) {
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
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
