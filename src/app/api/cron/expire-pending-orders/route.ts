import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { notifyOrderStatusChange } from "@/lib/order-notifications";
import { pruneRateLimitBuckets } from "@/server/rate-limit";
import { applyPaymentUpdate, cancelUnpaidOrder, findStaleUnpaidOrders } from "@/server/repositories/order-repository";

/** Pix vence em 1 dia e boleto em 3: passado esse prazo com folga, um pedido ainda sem pagamento está abandonado. */
const STALE_AFTER_MS = 4 * 24 * 60 * 60 * 1000;

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Cancela pedidos online que ficaram sem pagamento e devolve o estoque reservado — sem isso, um Pix
 * nunca pago seguraria a peça para sempre. Antes de cancelar, confere no Mercado Pago: se o pagamento
 * na verdade foi aprovado (webhook perdido), o pedido é marcado como pago em vez de cancelado.
 */
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const stale = await findStaleUnpaidOrders(new Date(Date.now() - STALE_AFTER_MS));
  let cancelled = 0;
  let recovered = 0;

  for (const order of stale) {
    if (order.mpPaymentId) {
      const payment = await getMercadoPagoPayment(order.mpPaymentId);
      if (!payment.success) continue; // não dá para saber: tenta no próximo ciclo
      if (payment.status === "approved") {
        const result = await applyPaymentUpdate({
          mpPaymentId: payment.id,
          externalReference: payment.externalReference,
          paymentStatus: payment.status,
          transactionAmount: payment.transactionAmount,
          netReceived: payment.netReceived,
        });
        if (result.success) {
          recovered += 1;
          await notifyOrderStatusChange(result.order, result.previousStatus);
        }
        continue;
      }
    }
    if (await cancelUnpaidOrder(order.id)) {
      cancelled += 1;
      await notifyOrderStatusChange({ ...order, status: "Cancelado" }, "Pedido recebido");
    }
  }

  const prunedBuckets = await pruneRateLimitBuckets().catch(() => 0);
  return NextResponse.json({ checked: stale.length, cancelled, recovered, prunedBuckets });
}
