import { escapeHtml, sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site-config";
import type { Order, OrderStatus } from "@/server/types";

const SUBJECT_BY_STATUS: Partial<Record<OrderStatus, string>> = {
  "Pagamento aprovado": "Fazaê: pagamento confirmado",
  Enviado: "Fazaê: seu pedido foi enviado",
  "Em trânsito": "Fazaê: seu pedido está a caminho",
  Entregue: "Fazaê: seu pedido foi entregue",
  Cancelado: "Fazaê: seu pedido foi cancelado",
};

function bodyForStatus(order: Order): string | null {
  const id = escapeHtml(order.id);
  switch (order.status) {
    case "Pagamento aprovado":
      return `<p>Seu pagamento foi confirmado! Já vamos preparar o pedido ${id}.</p>`;
    case "Enviado": {
      const trackingLine = order.tracking
        ? `<p>Código de rastreio: <strong>${escapeHtml(order.tracking)}</strong></p>`
        : "";
      return `<p>Seu pedido ${id} foi enviado!</p>${trackingLine}<p>Acompanhe em ${SITE_URL}/rastreamento</p>`;
    }
    case "Em trânsito":
      return `<p>Seu pedido ${id} está a caminho.</p><p>Acompanhe em ${SITE_URL}/rastreamento</p>`;
    case "Entregue":
      return `<p>Seu pedido ${id} foi entregue! Esperamos que você tenha amado o resultado.</p><p>Já pode avaliar o produto em ${SITE_URL}/conta/pedidos</p>`;
    case "Cancelado":
      return `<p>Seu pedido ${id} foi cancelado. Qualquer dúvida, é só responder este e-mail.</p>`;
    default:
      return null;
  }
}

/**
 * Sends a "seu pedido mudou de status" e-mail — only for statuses a customer
 * actually needs to hear about (see SUBJECT_BY_STATUS), only for online
 * orders (manual/presencial/whatsapp sales have no userEmail), and only when
 * the status actually changed, so re-saving the same status in the admin
 * (e.g. editing just the tracking code) never re-sends it.
 */
export async function notifyOrderStatusChange(order: Order, previousStatus: OrderStatus): Promise<void> {
  if (!order.userEmail || order.status === previousStatus) return;

  const subject = SUBJECT_BY_STATUS[order.status];
  const html = bodyForStatus(order);
  if (!subject || !html) return;

  await sendEmail({ to: order.userEmail, subject, html });
}
