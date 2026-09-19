import { escapeHtml, sendEmail } from "@/lib/email";
import { getEmailContactUrl, renderEmailLayout, type EmailAction } from "@/lib/email-template";
import { firstName } from "@/lib/format";
import { SITE_URL } from "@/lib/site-config";
import type { Order, OrderStatus } from "@/server/types";

const TRACKING_ACTION: EmailAction = { label: "Rastrear pedido", url: `${SITE_URL}/rastreamento` };
const ACCOUNT_ACTION: EmailAction = { label: "Acompanhar pedido", url: `${SITE_URL}/conta/pedidos` };
const REVIEW_ACTION: EmailAction = { label: "Avaliar produto", url: `${SITE_URL}/conta/pedidos` };

type StatusEmailContent = {
  subject: string;
  preheader: string;
  eyebrow: string;
  greeting: string;
  heading: string;
  bodyHtml: string;
  action?: EmailAction;
};

function contentForStatus(order: Order): StatusEmailContent | null {
  const id = escapeHtml(order.id);
  const name = firstName(order.customerName ?? order.address?.recipient ?? "Cliente Fazaê");

  switch (order.status) {
    case "Pagamento aprovado":
      return {
        subject: `Pagamento aprovado! Pedido ${order.id}`,
        preheader: "Recebemos a confirmação do seu pagamento.",
        eyebrow: "Pagamento",
        greeting: `E aí, ${name}!`,
        heading: "Pagamento aprovado!",
        bodyHtml: `<p style="margin:0;">Boa notícia! Seu pagamento foi confirmado certinho e nosso time já começou a preparar o pedido ${id} com todo o cuidado.</p>`,
        action: ACCOUNT_ACTION,
      };
    case "Enviado": {
      const trackingLine = order.tracking
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0 0;background-color:#FAFAF8;border-radius:10px;"><tr><td style="padding:14px 16px;font-size:14px;color:#111111;">Código de rastreio: <strong>${escapeHtml(order.tracking)}</strong></td></tr></table>`
        : "";
      return {
        subject: `Seu pedido ${order.id} já está a caminho!`,
        preheader: order.tracking ? `Código de rastreio: ${order.tracking}` : "Seu pedido foi enviado.",
        eyebrow: "Envio",
        greeting: `E aí, ${name}!`,
        heading: "Seu pedido tá a caminho!",
        bodyHtml: `<p style="margin:0;">Bora! O pedido ${id} acabou de sair daqui rumo à sua casa. Separamos, embalamos e mandamos tudo com muito carinho.</p>${trackingLine}`,
        action: TRACKING_ACTION,
      };
    }
    case "Em trânsito":
      return {
        subject: `Seu pedido ${order.id} está a caminho!`,
        preheader: "Seu pedido está em trânsito.",
        eyebrow: "Envio",
        greeting: `E aí, ${name}!`,
        heading: "Quase lá!",
        bodyHtml: `<p style="margin:0;">O pedido ${id} segue firme e forte no caminho até você. A ansiedade é normal, já, já chega!</p>`,
        action: TRACKING_ACTION,
      };
    case "Entregue":
      return {
        subject: `Seu pedido ${order.id} chegou!`,
        preheader: "Seu pedido chegou! Conta pra gente o que achou.",
        eyebrow: "Entrega",
        greeting: `E aí, ${name}!`,
        heading: "Seu pedido chegou!",
        bodyHtml: `<p style="margin:0;">Chegou a hora! Esperamos muito que você ame cada detalhe do pedido ${id}. Adoraríamos saber o que achou, sua opinião significa muito pra gente.</p>`,
        action: REVIEW_ACTION,
      };
    case "Cancelado":
      return {
        subject: `Seu pedido ${order.id} foi cancelado`,
        preheader: "Seu pedido foi cancelado.",
        eyebrow: "Pedido cancelado",
        greeting: `E aí, ${name}.`,
        heading: "Seu pedido foi cancelado",
        bodyHtml: `<p style="margin:0;">O pedido ${id} foi cancelado. Sentimos muito por isso. Qualquer dúvida, é só responder este e-mail ou chamar a gente no WhatsApp que resolvemos juntos.</p>`,
      };
    default:
      return null;
  }
}

/**
 * Sends a "seu pedido mudou de status" e-mail — only for statuses a customer
 * actually needs to hear about (see contentForStatus), only for online
 * orders (manual/presencial/whatsapp sales have no userEmail), and only when
 * the status actually changed, so re-saving the same status in the admin
 * (e.g. editing just the tracking code) never re-sends it.
 */
export async function notifyOrderStatusChange(order: Order, previousStatus: OrderStatus): Promise<void> {
  if (!order.userEmail || order.status === previousStatus) return;

  const content = contentForStatus(order);
  if (!content) return;

  await sendEmail({
    to: order.userEmail,
    subject: content.subject,
    html: renderEmailLayout({ ...content, contactUrl: await getEmailContactUrl() }),
  });
}
