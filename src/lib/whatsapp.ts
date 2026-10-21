/** Regras puras do WhatsApp no painel (sem banco nem rede): telefone, etapas do funil, opt-out e leitura dos webhooks da uazapi. */

export const LEAD_STAGES = [
  { key: "novo", label: "Novo" },
  { key: "contato", label: "Em contato" },
  { key: "interessado", label: "Interessado" },
  { key: "proposta", label: "Proposta enviada" },
  { key: "ganho", label: "Ganho" },
  { key: "perdido", label: "Perdido" },
] as const;
export type LeadStage = (typeof LEAD_STAGES)[number]["key"];
export const LEAD_STAGE_KEYS: string[] = LEAD_STAGES.map((s) => s.key);
export const stageLabel = (key: string) => LEAD_STAGES.find((s) => s.key === key)?.label ?? key;

export const CONVERSATION_SOURCES = [
  { key: "entrada", label: "Chamou primeiro" },
  { key: "prospeccao", label: "Prospecção" },
  { key: "cliente", label: "Cliente" },
] as const;
export const sourceLabel = (key: string) => CONVERSATION_SOURCES.find((s) => s.key === key)?.label ?? key;

/** Telefone só com dígitos e DDI. 10 ou 11 dígitos (DDD + número) ganham o 55 do Brasil; fora disso devolve null. */
export function normalizePhone(input: string | null | undefined): string | null {
  const digits = (input ?? "").replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) return digits;
  return null;
}

/** "5584999998888@s.whatsapp.net" → "5584999998888". IDs do tipo @lid não são telefone: devolve null. */
export function phoneFromJid(jid: string | null | undefined): string | null {
  if (!jid || !jid.includes("@")) return normalizePhone(jid);
  const [user, server] = jid.split("@");
  if (server !== "s.whatsapp.net") return null;
  return normalizePhone(user.split(":")[0]);
}

/** Mostra o número como "(84) 99999-8888". */
export function formatPhone(phone: string) {
  const local = phone.startsWith("55") && phone.length >= 12 ? phone.slice(2) : phone;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return phone;
}

function plain(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const OPT_OUT_PHRASES = new Set([
  "sair",
  "parar",
  "pare",
  "stop",
  "cancelar",
  "descadastrar",
  "nao quero",
  "nao quero mais",
  "nao quero receber",
  "nao tenho interesse",
  "remover",
  "remova meu numero",
  "me remova",
  "pare de enviar",
  "pare de mandar mensagem",
]);

/** O cliente pediu para sair? Só vale a mensagem inteira (ou quase), para "preciso sair às 15h" não bloquear ninguém. */
export function isOptOutText(text: string | null | undefined) {
  return OPT_OUT_PHRASES.has(plain(text ?? ""));
}

export function messagePreview(text: string, mediaType?: string | null) {
  if (!text.trim() && mediaType) return `[${MEDIA_LABELS[mediaType] ?? "arquivo"}]`;
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 90 ? `${flat.slice(0, 89)}…` : flat;
}

const MEDIA_LABELS: Record<string, string> = {
  image: "imagem",
  video: "vídeo",
  audio: "áudio",
  document: "documento",
  sticker: "figurinha",
  location: "localização",
  contact: "contato",
};

export type InboundMessage = {
  phone: string;
  name: string | null;
  fromMe: boolean;
  text: string;
  mediaType: string | null;
  providerId: string;
  at: Date;
};

const MEDIA_TYPES: [RegExp, string][] = [
  [/image/i, "image"],
  [/video/i, "video"],
  [/audio|ptt/i, "audio"],
  [/document/i, "document"],
  [/sticker/i, "sticker"],
  [/location/i, "location"],
  [/contact|vcard/i, "contact"],
];

type Json = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" && v.length > 0 ? v : null);

/** Lê o evento "messages" da uazapi. Devolve null para o que o painel ignora: grupos, status/stories, canais e eventos de outro tipo. */
export function parseUazapiMessage(payload: unknown): InboundMessage | null {
  const body = payload as Json | null;
  if (!body || body.EventType !== "messages") return null;
  const message = body.message as Json | undefined;
  if (!message || message.isGroup === true) return null;

  const chatid = str(message.chatid);
  if (!chatid || chatid.endsWith("@g.us") || chatid.endsWith("@newsletter") || chatid.startsWith("status@")) return null;

  const fromMe = message.fromMe === true;
  const chat = body.chat as Json | undefined;
  // O contato pode vir como @lid (sem telefone): nesse caso o número está em sender_pn / no chat.
  const phone =
    phoneFromJid(chatid) ??
    phoneFromJid(str(message.sender_pn)) ??
    phoneFromJid(str(chat?.phone)) ??
    phoneFromJid(str(chat?.wa_chatid));
  const providerId = str(message.messageid) ?? str(message.id);
  if (!phone || !providerId) return null;

  const messageType = str(message.messageType) ?? "";
  const mediaType = MEDIA_TYPES.find(([re]) => re.test(messageType))?.[1] ?? null;
  const ts = typeof message.messageTimestamp === "number" ? message.messageTimestamp : null;
  const at = ts ? new Date(ts > 1e11 ? ts : ts * 1000) : new Date();

  return {
    phone,
    name: fromMe ? str(chat?.name) : (str(message.senderName) ?? str(chat?.name)),
    fromMe,
    text: str(message.text) ?? "",
    mediaType,
    providerId,
    at,
  };
}

export type StatusUpdate = { providerIds: string[]; status: "sent" | "delivered" | "read" | "failed" };

/** Lê o evento "messages_update" (confirmação de entrega/leitura). */
export function parseUazapiStatusUpdate(payload: unknown): StatusUpdate | null {
  const body = payload as Json | null;
  if (!body || body.EventType !== "messages_update") return null;
  const event = body.event as Json | undefined;
  const ids = Array.isArray(event?.MessageIDs) ? (event!.MessageIDs as unknown[]).filter((i): i is string => typeof i === "string") : [];
  if (ids.length === 0) return null;
  const raw = (str(body.state) ?? str(event?.Type) ?? "").toLowerCase();
  const status = raw === "read" || raw === "played" ? "read" : raw === "delivered" ? "delivered" : raw === "sent" ? "sent" : raw === "failed" ? "failed" : null;
  return status ? { providerIds: ids, status } : null;
}

const STATUS_RANK: Record<string, number> = { queued: 0, failed: 0, sent: 1, delivered: 2, read: 3 };

/** Um status só avança (lida nunca volta para entregue), porque os eventos podem chegar repetidos ou fora de ordem. */
export function nextStatus(current: string, incoming: string) {
  if (incoming === "failed") return current === "queued" ? "failed" : current;
  return (STATUS_RANK[incoming] ?? 0) > (STATUS_RANK[current] ?? 0) ? incoming : current;
}
