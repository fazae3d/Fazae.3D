import { MercadoPagoConfig, Payment } from "mercadopago";
import { SITE_URL } from "@/lib/site-config";

const client = process.env.MERCADOPAGO_ACCESS_TOKEN
  ? new MercadoPagoConfig({ accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN })
  : null;

export type MercadoPagoPaymentResult =
  | {
      success: true;
      id: string;
      status: string;
      statusDetail: string;
      paymentTypeId: string;
      /** Present for Pix — the customer still needs to actually scan/pay this to complete the purchase. */
      qrCode?: string;
      qrCodeBase64?: string;
      /** Present for boleto — printable voucher link the customer needs to pay. */
      ticketUrl?: string;
    }
  | { success: false; error: string };

/**
 * Creates a payment from a Payment Brick's `formData` (already shaped for
 * `POST /v1/payments` by the SDK). `transactionAmount`, `description` and
 * `externalReference` are always taken from the server-computed values
 * passed in here, never from `formData` — the client-reported amount is
 * only ever a display value, the same principle already applied to prices
 * elsewhere in checkout.
 */
export async function createMercadoPagoPayment({
  transactionAmount,
  description,
  externalReference,
  payerEmail,
  formData,
}: {
  transactionAmount: number;
  description: string;
  externalReference: string;
  payerEmail: string;
  formData: Record<string, unknown>;
}): Promise<MercadoPagoPaymentResult> {
  if (!client) {
    console.warn("[mercadopago] MERCADOPAGO_ACCESS_TOKEN não configurado — pagamento não processado.");
    return { success: false, error: "Pagamento não configurado." };
  }

  try {
    const payment = new Payment(client);
    const existingPayer = (formData.payer as Record<string, unknown> | undefined) ?? {};
    // Só os campos que o Brick realmente envia: espalhar o formData inteiro deixaria o navegador
    // definir opções do pagamento (captura manual, modo binário, informações adicionais...).
    const allowed = Object.fromEntries(
      ["token", "issuer_id", "payment_method_id", "installments"]
        .filter((key) => formData[key] !== undefined)
        .map((key) => [key, formData[key]]),
    );
    const result = await payment.create({
      body: {
        ...allowed,
        transaction_amount: transactionAmount,
        description,
        external_reference: externalReference,
        payer: {
          email: payerEmail,
          ...(existingPayer.identification ? { identification: existingPayer.identification } : {}),
        },
        // Explicit per-payment webhook URL — doesn't depend on the "Notificações"
        // panel in the MP dashboard being configured correctly, which is easy to
        // get wrong (or leave unset) and silently stops every status update.
        notification_url: `${SITE_URL}/api/webhooks/mercadopago`,
      },
      requestOptions: { idempotencyKey: externalReference },
    });

    if (!result.id || !result.status) {
      return { success: false, error: "Resposta inesperada do Mercado Pago." };
    }

    const transactionData = result.point_of_interaction?.transaction_data;
    return {
      success: true,
      id: String(result.id),
      status: result.status,
      statusDetail: result.status_detail ?? "",
      paymentTypeId: result.payment_type_id ?? "",
      qrCode: transactionData?.qr_code,
      qrCodeBase64: transactionData?.qr_code_base64,
      ticketUrl: transactionData?.ticket_url,
    };
  } catch (error) {
    console.error("[mercadopago] falha ao criar pagamento", error);
    return { success: false, error: "Não foi possível processar o pagamento. Verifique os dados e tente novamente." };
  }
}

export type MercadoPagoPaymentLookupResult =
  | { success: true; id: string; status: string; externalReference: string | null; transactionAmount?: number }
  | { success: false; error: string };

/** Used by the webhook route — never trusts the notification payload's own status, always re-fetches from Mercado Pago. */
export async function getMercadoPagoPayment(id: string): Promise<MercadoPagoPaymentLookupResult> {
  if (!client) {
    return { success: false, error: "Pagamento não configurado." };
  }

  try {
    const payment = new Payment(client);
    const result = await payment.get({ id });
    if (!result.id || !result.status) {
      return { success: false, error: "Resposta inesperada do Mercado Pago." };
    }
    return {
      success: true,
      id: String(result.id),
      status: result.status,
      externalReference: result.external_reference ?? null,
      transactionAmount: result.transaction_amount ?? undefined,
    };
  } catch (error) {
    console.error("[mercadopago] falha ao consultar pagamento", error);
    return { success: false, error: "Falha ao consultar pagamento." };
  }
}

export type PaymentInstructionsLookup = { qrCode?: string; qrCodeBase64?: string; ticketUrl?: string };

/** Busca de novo o QR do Pix / link do boleto de um pagamento pendente, para a pessoa pagar depois sem refazer o pedido. */
export async function getPendingPaymentInstructions(id: string): Promise<PaymentInstructionsLookup | null> {
  if (!client) return null;
  try {
    const result = await new Payment(client).get({ id });
    if (result.status !== "pending" && result.status !== "in_process") return null;
    const data = result.point_of_interaction?.transaction_data;
    return { qrCode: data?.qr_code, qrCodeBase64: data?.qr_code_base64, ticketUrl: data?.ticket_url };
  } catch (error) {
    console.error("[mercadopago] falha ao reconsultar instruções de pagamento", id, error);
    return null;
  }
}

/** Maps Mercado Pago's `payment_type_id` to this app's own PaymentMethod union, used for display/reporting only. */
export function mapPaymentTypeToMethod(paymentTypeId: string): "pix" | "cartao" | "boleto" {
  if (paymentTypeId === "bank_transfer") return "pix";
  if (paymentTypeId === "ticket" || paymentTypeId === "atm") return "boleto";
  return "cartao";
}
