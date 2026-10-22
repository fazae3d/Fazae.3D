import { db } from "../db";

export type OrderTemplates = { pago: string; enviado: string; pix: string };

export const DEFAULT_AWAY_TEXT = "Oi! Recebemos a sua mensagem fora do nosso horário de atendimento. Assim que abrirmos, respondemos por aqui. Obrigado pela paciência! 😊";
export const DEFAULT_GREETING_TEXT = "Olá! Aqui é da Fazaê 3D. Já vamos te atender. Enquanto isso, conta pra gente o que você precisa?";

/** Variáveis dos avisos de pedido: {{nome}}, {{pedido}}, {{total}} e {{rastreio}}. */
export const DEFAULT_ORDER_TEMPLATES: OrderTemplates = {
  pago: "Oi, {{nome}}! Recebemos o pagamento do seu pedido {{pedido}}. Já vamos preparar tudo com carinho. Qualquer dúvida é só responder por aqui.",
  enviado: "Oi, {{nome}}! Seu pedido {{pedido}} acabou de sair para a entrega. Código de rastreio: {{rastreio}}. Você acompanha em https://www.fazae3d.com.br/rastreamento",
  pix: "Oi, {{nome}}! O Pix do pedido {{pedido}} ({{total}}) vence hoje. Seu pedido está reservado: é só pagar com o código abaixo para a gente começar a preparar.",
};

export type WaAutomationSettings = {
  awayEnabled: boolean;
  awayText: string;
  greetingEnabled: boolean;
  greetingText: string;
  orderNotifyEnabled: boolean;
  orderTemplates: OrderTemplates;
};

export const DEFAULT_AUTOMATION: WaAutomationSettings = {
  awayEnabled: false,
  awayText: DEFAULT_AWAY_TEXT,
  greetingEnabled: false,
  greetingText: DEFAULT_GREETING_TEXT,
  orderNotifyEnabled: false,
  orderTemplates: DEFAULT_ORDER_TEMPLATES,
};

function cleanTemplates(raw: unknown): OrderTemplates {
  const input = (raw ?? {}) as Partial<Record<keyof OrderTemplates, unknown>>;
  const pick = (key: keyof OrderTemplates) => (typeof input[key] === "string" && (input[key] as string).trim() ? (input[key] as string).trim().slice(0, 1000) : DEFAULT_ORDER_TEMPLATES[key]);
  return { pago: pick("pago"), enviado: pick("enviado"), pix: pick("pix") };
}

export async function getAutomationSettings(): Promise<WaAutomationSettings> {
  const row = await db.waConfig.findUnique({ where: { id: 1 } });
  if (!row) return DEFAULT_AUTOMATION;
  return {
    awayEnabled: row.awayEnabled,
    awayText: row.awayText || DEFAULT_AWAY_TEXT,
    greetingEnabled: row.greetingEnabled,
    greetingText: row.greetingText || DEFAULT_GREETING_TEXT,
    orderNotifyEnabled: row.orderNotifyEnabled,
    orderTemplates: cleanTemplates(row.orderTemplates),
  };
}

export async function saveAutomationSettings(input: WaAutomationSettings): Promise<void> {
  const data = {
    awayEnabled: input.awayEnabled,
    awayText: input.awayText.trim().slice(0, 1000) || null,
    greetingEnabled: input.greetingEnabled,
    greetingText: input.greetingText.trim().slice(0, 1000) || null,
    orderNotifyEnabled: input.orderNotifyEnabled,
    orderTemplates: cleanTemplates(input.orderTemplates),
  };
  await db.waConfig.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
}

export type OptedOutContact = { id: string; phone: string; name: string | null; lastMessageAt: string | null };

/** Quem pediu para não receber mensagens (para conferir e reativar se foi engano). */
export async function listOptedOut(): Promise<OptedOutContact[]> {
  const rows = await db.waConversation.findMany({ where: { optedOut: true }, orderBy: { updatedAt: "desc" }, take: 300, select: { id: true, phone: true, name: true, lastMessageAt: true } });
  return rows.map((r) => ({ id: r.id, phone: r.phone, name: r.name, lastMessageAt: r.lastMessageAt?.toISOString() ?? null }));
}
