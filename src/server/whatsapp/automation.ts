import { db } from "../db";
import { getAutomationSettings } from "../repositories/wa-settings-repository";
import { getWaConfig } from "../repositories/wa-cadence-repository";
import { sendConversationText, startConversation } from "../repositories/whatsapp-repository";
import { renderMessage, isWithinSchedule, DEFAULT_SEND_DAYS } from "@/lib/wa-cadence";
import { firstName, formatPrice } from "@/lib/format";
import { isMobilePhone, isOptOutText, normalizePhone, withOptOutNotice } from "@/lib/whatsapp";
import type { Order } from "../types";

const AUTO_REPLY_COOLDOWN_MS = 12 * 3_600_000;
const RECENT_HUMAN_REPLY_MS = 30 * 60_000;

/**
 * Resposta automática a quem escreve: "fora do horário" quando a loja está fechada e saudação para contato novo no horário.
 * No máximo uma a cada 12 horas por contato, nunca se você já respondeu há pouco, nunca para quem pediu para sair.
 */
export async function maybeAutoReply(input: { conversationId: string; created: boolean; text: string; at: Date }): Promise<void> {
  try {
    const settings = await getAutomationSettings();
    if (!settings.awayEnabled && !settings.greetingEnabled) return;
    if (isOptOutText(input.text)) return;

    const conversation = await db.waConversation.findUnique({ where: { id: input.conversationId } });
    if (!conversation || conversation.optedOut) return;
    if (conversation.lastAutoReplyAt && input.at.getTime() - conversation.lastAutoReplyAt.getTime() < AUTO_REPLY_COOLDOWN_MS) return;
    const humanRecently = await db.waMessage.count({
      where: { conversationId: conversation.id, direction: "out", origin: { in: ["manual", "celular"] }, createdAt: { gte: new Date(input.at.getTime() - RECENT_HUMAN_REPLY_MS) } },
    });
    if (humanRecently > 0) return;

    const config = await getWaConfig();
    const open = isWithinSchedule(input.at, { sendDays: DEFAULT_SEND_DAYS, windowStartHour: null, windowEndHour: null }, config);
    const text = !open && settings.awayEnabled ? settings.awayText : open && input.created && conversation.source === "entrada" && settings.greetingEnabled ? settings.greetingText : null;
    if (!text) return;

    const sent = await sendConversationText(conversation.id, renderMessage(text, conversation, () => 0), { origin: "automatica" });
    if (sent.success) await db.waConversation.update({ where: { id: conversation.id }, data: { lastAutoReplyAt: input.at } });
  } catch (error) {
    console.error("[whatsapp] erro na resposta automática", error);
  }
}

function fill(template: string, vars: Record<string, string>) {
  return template
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_, key: string) => vars[key.toLowerCase()] ?? "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

type OrderEvent = "pago" | "enviado" | "pix";

/** Manda o aviso do pedido pelo WhatsApp (uma única vez por pedido e evento). Devolve se foi enviado. */
async function sendOrderMessage(order: Pick<Order, "id" | "customerName" | "customerPhone" | "total" | "tracking" | "address">, event: OrderEvent, extraCode?: string): Promise<boolean> {
  try {
    const settings = await getAutomationSettings();
    if (!settings.orderNotifyEnabled) return false;
    const phone = normalizePhone(order.customerPhone);
    if (!phone || !isMobilePhone(phone)) return false;

    const name = firstName(order.customerName ?? order.address?.recipient ?? "tudo bem");
    const vars = { nome: name, pedido: order.id, total: formatPrice(order.total), rastreio: order.tracking ?? "" };
    if (event === "enviado" && !order.tracking) vars.rastreio = "em breve no site";

    const opened = await startConversation({ phone, name: order.customerName ?? undefined, source: "cliente" });
    if (!opened.success) return false;

    // Primeira conversa com o número: acrescenta o aviso de saída.
    const previous = await db.waMessage.count({ where: { conversationId: opened.id, direction: "out", status: { not: "failed" } } });
    let text = fill(settings.orderTemplates[event], vars);
    if (previous === 0) text = withOptOutNotice(text);

    const sent = await sendConversationText(opened.id, text, { origin: "pedido", ref: `pedido:${order.id}:${event}` });
    if (!sent.success) return false;
    // O código do Pix vai sozinho, em outra mensagem, para dar para copiar com um toque.
    if (extraCode) await sendConversationText(opened.id, extraCode, { origin: "pedido", ref: `pedido:${order.id}:${event}-codigo` });
    return true;
  } catch (error) {
    console.error("[whatsapp] erro no aviso de pedido", error);
    return false;
  }
}

/** Gancho da mudança de status: avisa pagamento aprovado e pedido enviado (só pedidos do site). */
export async function notifyOrderWhatsApp(order: Order, previousStatus: string): Promise<void> {
  if (order.channel !== "online" || order.status === previousStatus) return;
  if (order.status === "Pagamento aprovado") await sendOrderMessage(order, "pago");
  else if (order.status === "Enviado") await sendOrderMessage(order, "enviado");
}

/** Lembrete de Pix pelo WhatsApp (com o código copia-e-cola). Devolve se foi enviado, para o e-mail não repetir. */
export async function notifyPixWhatsApp(order: Order, pixCode: string): Promise<boolean> {
  return sendOrderMessage(order, "pix", pixCode);
}
