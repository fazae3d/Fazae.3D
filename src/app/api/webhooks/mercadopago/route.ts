import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getMercadoPagoPayment } from "@/lib/mercadopago";
import { applyPaymentUpdate } from "@/server/repositories/order-repository";
import { notifyOrderStatusChange } from "@/lib/order-notifications";
import { notifyOwner } from "@/lib/owner-notify";

/**
 * Verifies the `x-signature` header per Mercado Pago's manifest scheme:
 * HMAC-SHA256("id:{data.id};request-id:{x-request-id};ts:{ts};", secret).
 * https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/your-integrations/notifications/webhooks#bookmark_verificando_a_origem_da_notifica%C3%A7%C3%A3o
 *
 * Returns "valid" | "invalid" | "unconfigured". Em produção, "unconfigured" é tratado como erro
 * (falha fechada); fora dela, segue sem validar para facilitar testes locais.
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
 *
 * Respostas 5xx fazem o Mercado Pago reenviar a notificação mais tarde; 200 encerra a entrega.
 */
export async function POST(request: NextRequest) {
  const signatureStatus = verifyWebhookSignature(request);
  if (signatureStatus === "invalid") {
    console.warn("[mercadopago webhook] assinatura x-signature inválida — requisição rejeitada");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }
  if (signatureStatus === "unconfigured") {
    if (process.env.NODE_ENV === "production") {
      console.error("[mercadopago webhook] MERCADOPAGO_WEBHOOK_SECRET não configurado em produção — recusando");
      return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
    }
    console.warn("[mercadopago webhook] MERCADOPAGO_WEBHOOK_SECRET não configurado — pulando validação de assinatura (dev)");
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
    return NextResponse.json({ error: "payment lookup failed" }, { status: 502 });
  }

  let result;
  try {
    result = await applyPaymentUpdate({
      mpPaymentId: payment.id,
      externalReference: payment.externalReference,
      paymentStatus: payment.status,
      transactionAmount: payment.transactionAmount,
      netReceived: payment.netReceived,
    });
  } catch (error) {
    console.error("[mercadopago webhook] falha ao atualizar pedido", payment.id, error);
    return NextResponse.json({ error: "order update failed" }, { status: 500 });
  }

  if (!result.success) {
    console.warn("[mercadopago webhook]", result.reason, payment.id, result.error);
    if (result.reason === "amount_mismatch") {
      await notifyOwner(`ATENÇÃO: valor pago diferente do pedido (${payment.externalReference ?? payment.id})`, [
        result.error,
        `Pagamento Mercado Pago: ${payment.id}. O pedido NÃO foi marcado como pago; confira no painel do Mercado Pago.`,
      ]);
    } else if (payment.status === "approved") {
      await notifyOwner(`ATENÇÃO: pagamento aprovado sem pedido (${payment.id})`, [
        `O Mercado Pago aprovou o pagamento ${payment.id} (referência ${payment.externalReference ?? "sem referência"}), mas nenhum pedido correspondente foi encontrado.`,
        "Confira o pedido no painel do Mercado Pago e crie a venda manualmente se necessário.",
      ]);
    }
    return NextResponse.json({ received: true });
  }

  if (payment.status === "approved" && result.order.status === "Cancelado") {
    await notifyOwner(`ATENÇÃO: pagamento aprovado em pedido cancelado (${result.order.id})`, [
      `O pagamento ${payment.id} foi aprovado, mas o pedido ${result.order.id} já estava cancelado (por falta de pagamento no prazo).`,
      "Fale com o cliente: reative o pedido ou estorne o valor no Mercado Pago.",
    ]);
  }

  await notifyOrderStatusChange(result.order, result.previousStatus);

  if (result.order.status === "Pagamento aprovado" && result.previousStatus !== "Pagamento aprovado") {
    await notifyOwner(`Pagamento aprovado: pedido ${result.order.id}`, [
      `Pedido ${result.order.id} pago (R$ ${result.order.total.toFixed(2).replace(".", ",")}).`,
      "Abra o painel para separar e enviar.",
    ]);
  }
  if (payment.status === "refunded" || payment.status === "charged_back") {
    await notifyOwner(`Reembolso/chargeback no pedido ${result.order.id}`, [
      `O Mercado Pago registrou "${payment.status}" para o pedido ${result.order.id}. O status de entrega do pedido não foi alterado: confira e ajuste no painel.`,
    ]);
  }

  return NextResponse.json({ received: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
