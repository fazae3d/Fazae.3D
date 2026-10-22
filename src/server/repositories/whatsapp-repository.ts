import { db } from "../db";
import { getWhatsAppProvider, type MediaKind } from "../whatsapp/provider";
import { storeDayKey } from "@/lib/store-time";
import { isOptOutText, messagePreview, nextStatus, normalizePhone, LEAD_STAGE_KEYS, type InboundMessage } from "@/lib/whatsapp";

export type WaConversationView = {
  id: string;
  phone: string;
  name: string | null;
  source: string;
  stage: string;
  tags: string[];
  notes: string | null;
  optedOut: boolean;
  unreadCount: number;
  lastMessageAt: string | null;
  lastPreview: string | null;
  lastInboundAt: string | null;
  /** "in" = o cliente falou por último e ainda não respondemos. */
  lastDirection: string | null;
  hasWhatsapp: boolean | null;
  nextActionAt: string | null;
  nextActionNote: string | null;
  createdAt: string;
};

export type WaMessageView = {
  id: string;
  direction: "in" | "out";
  body: string;
  mediaType: string | null;
  mediaUrl: string | null;
  status: string;
  origin: string;
  error: string | null;
  createdAt: string;
};

type ConversationRow = Awaited<ReturnType<typeof db.waConversation.findFirstOrThrow>>;

function toConversation(row: ConversationRow): WaConversationView {
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    source: row.source,
    stage: row.stage,
    tags: row.tags,
    notes: row.notes,
    optedOut: row.optedOut,
    unreadCount: row.unreadCount,
    lastMessageAt: row.lastMessageAt?.toISOString() ?? null,
    lastPreview: row.lastPreview,
    lastInboundAt: row.lastInboundAt?.toISOString() ?? null,
    lastDirection: row.lastDirection,
    hasWhatsapp: row.hasWhatsapp,
    nextActionAt: row.nextActionAt?.toISOString() ?? null,
    nextActionNote: row.nextActionNote,
    createdAt: row.createdAt.toISOString(),
  };
}

export type ConversationFilter = { onlyUnread?: boolean; waiting?: boolean; due?: boolean; stage?: string; q?: string };

/** Fim do dia de hoje no fuso da loja (o fuso é UTC-3 fixo: 23:59:59 local = 02:59:59 UTC do dia seguinte). */
function endOfStoreDay(now: Date) {
  const day = new Date(`${storeDayKey(now)}T03:00:00.000Z`);
  return new Date(day.getTime() + 24 * 3_600_000 - 1);
}

/** Contadores das visões "Aguardando você" e "Para hoje". */
export async function getConversationCounts(now = new Date()): Promise<{ waiting: number; due: number }> {
  const [waiting, due] = await Promise.all([
    db.waConversation.count({ where: { lastDirection: "in", optedOut: false } }),
    db.waConversation.count({ where: { nextActionAt: { lte: endOfStoreDay(now) } } }),
  ]);
  return { waiting, due };
}

export async function listConversations(filter: ConversationFilter = {}): Promise<WaConversationView[]> {
  const q = filter.q?.trim();
  const digits = q?.replace(/\D/g, "");
  const rows = await db.waConversation.findMany({
    where: {
      ...(filter.onlyUnread ? { unreadCount: { gt: 0 } } : {}),
      ...(filter.waiting ? { lastDirection: "in", optedOut: false } : {}),
      ...(filter.due ? { nextActionAt: { lte: endOfStoreDay(new Date()) } } : {}),
      ...(filter.stage ? { stage: filter.stage } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              ...(digits && digits.length >= 4 ? [{ phone: { contains: digits } }] : []),
              { tags: { has: q.toLowerCase() } },
            ],
          }
        : {}),
    },
    // Aguardando você: quem espera há mais tempo aparece primeiro. Para hoje: a data combinada mais antiga primeiro.
    orderBy: filter.waiting
      ? [{ lastInboundAt: { sort: "asc", nulls: "last" } }]
      : filter.due
        ? [{ nextActionAt: { sort: "asc", nulls: "last" } }]
        : [{ lastMessageAt: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
    take: 200,
  });
  return rows.map(toConversation);
}

export async function getConversation(id: string): Promise<WaConversationView | null> {
  const row = await db.waConversation.findUnique({ where: { id } });
  return row ? toConversation(row) : null;
}

export async function getConversationMessages(conversationId: string, limit = 200): Promise<WaMessageView[]> {
  const rows = await db.waMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "desc" }, take: limit });
  return rows.reverse().map((m) => ({
    id: m.id,
    direction: m.direction === "in" ? "in" : "out",
    body: m.body,
    mediaType: m.mediaType,
    mediaUrl: m.mediaUrl,
    status: m.status,
    origin: m.origin,
    error: m.error,
    createdAt: m.createdAt.toISOString(),
  }));
}

export async function countUnreadConversations(): Promise<number> {
  return db.waConversation.count({ where: { unreadCount: { gt: 0 } } });
}

/** Registra uma mensagem que chegou pelo webhook (ou que foi enviada direto do celular). Repetida = ignorada. */
export async function recordInboundMessage(msg: InboundMessage): Promise<{ duplicate: boolean; conversationId?: string; created?: boolean }> {
  if (await db.waMessage.findUnique({ where: { providerId: msg.providerId }, select: { id: true } })) return { duplicate: true };

  const optOut = !msg.fromMe && isOptOutText(msg.text);
  const preview = messagePreview(msg.text, msg.mediaType);
  let conversationId = "";
  let created = false;
  try {
    await db.$transaction(async (tx) => {
      created = !(await tx.waConversation.findUnique({ where: { phone: msg.phone }, select: { id: true } }));
      const conversation = await tx.waConversation.upsert({
        where: { phone: msg.phone },
        create: {
          phone: msg.phone,
          name: msg.name,
          // Quem chamou primeiro é "entrada"; se a primeira mensagem saiu do nosso aparelho, é prospecção.
          source: msg.fromMe ? "prospeccao" : "entrada",
          unreadCount: msg.fromMe ? 0 : 1,
          lastMessageAt: msg.at,
          lastPreview: preview,
          lastInboundAt: msg.fromMe ? null : msg.at,
          lastDirection: msg.fromMe ? "out" : "in",
          optedOut: optOut,
        },
        update: {
          lastMessageAt: msg.at,
          lastPreview: preview,
          lastDirection: msg.fromMe ? "out" : "in",
          ...(msg.fromMe ? {} : { unreadCount: { increment: 1 }, lastInboundAt: msg.at }),
          ...(optOut ? { optedOut: true } : {}),
        },
      });
      conversationId = conversation.id;
      if (!conversation.name && msg.name) await tx.waConversation.update({ where: { id: conversation.id }, data: { name: msg.name } });
      await tx.waMessage.create({
        data: {
          conversationId: conversation.id,
          direction: msg.fromMe ? "out" : "in",
          body: msg.text,
          mediaType: msg.mediaType,
          mediaUrl: msg.mediaUrl,
          providerId: msg.providerId,
          status: msg.fromMe ? "sent" : "delivered",
          origin: msg.fromMe ? "celular" : "cliente",
          createdAt: msg.at,
        },
      });
      // Cliente respondeu (ou pediu para sair): as cadências deixam de escrever para ele.
      if (!msg.fromMe) {
        await tx.waEnrollment.updateMany({
          where: { conversationId: conversation.id, status: "ativa" },
          data: { status: "parada", stopReason: optOut ? "pediu para sair" : "respondeu", nextRunAt: null },
        });
      }
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") return { duplicate: true };
    throw error;
  }
  return { duplicate: false, conversationId, created };
}

/** Atualiza entrega/leitura das mensagens pelo id do provedor (status só avança). */
export async function applyStatusUpdate(providerIds: string[], status: string): Promise<void> {
  const rows = await db.waMessage.findMany({ where: { providerId: { in: providerIds }, direction: "out" }, select: { id: true, status: true } });
  for (const row of rows) {
    const next = nextStatus(row.status, status);
    if (next !== row.status) await db.waMessage.update({ where: { id: row.id }, data: { status: next } });
  }
}

export type SendTextResult = { success: true; messageId: string } | { success: false; error: string };

/** Envia um texto e registra na conversa. Contato que pediu para sair nunca recebe nada. */
export async function sendConversationText(
  conversationId: string,
  text: string,
  options: { origin?: SendOrigin; delayMs?: number; cadenceId?: string; stepIndex?: number; ref?: string } = {},
): Promise<SendTextResult> {
  const body = text.trim();
  if (!body) return { success: false, error: "Escreva a mensagem." };
  if (body.length > 4000) return { success: false, error: "A mensagem passa de 4.000 caracteres." };

  const conversation = await db.waConversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return { success: false, error: "Conversa não encontrada." };
  if (conversation.optedOut) return { success: false, error: "Esse contato pediu para não receber mensagens. Se foi engano, reative nas opções do contato." };
  // Aviso automático com chave já usada: nunca manda o mesmo aviso duas vezes.
  if (options.ref && (await db.waMessage.findUnique({ where: { ref: options.ref }, select: { id: true } }))) return { success: false, error: "Esse aviso já foi enviado." };

  const origin = options.origin ?? "manual";
  const result = await getWhatsAppProvider().sendText(conversation.phone, body, { delayMs: options.delayMs });
  const now = new Date();

  if (!result.ok) {
    await db.waMessage.create({
      data: { conversationId, direction: "out", body, status: "failed", origin, error: result.error, createdAt: now, cadenceId: options.cadenceId, stepIndex: options.stepIndex },
    });
    await db.waConversation.update({ where: { id: conversationId }, data: { lastMessageAt: now, lastPreview: messagePreview(body) } });
    return { success: false, error: result.error };
  }

  // O webhook do próprio envio pode chegar antes deste registro: o upsert pelo id do provedor junta os dois.
  const message = await db.waMessage.upsert({
    where: { providerId: result.providerId },
    create: { conversationId, direction: "out", body, providerId: result.providerId, status: "sent", origin, createdAt: now, cadenceId: options.cadenceId, stepIndex: options.stepIndex, ref: options.ref },
    update: { origin, body, cadenceId: options.cadenceId, stepIndex: options.stepIndex, ref: options.ref },
  });
  await db.waConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: now, lastPreview: messagePreview(body), unreadCount: 0, lastDirection: "out" },
  });
  return { success: true, messageId: message.id };
}

export type SendOrigin = "manual" | "cadencia" | "campanha" | "pedido" | "automatica";

/** Envia um arquivo (ex.: o PDF do orçamento) pela conversa e registra. */
export async function sendConversationMedia(
  conversationId: string,
  media: { url: string; kind: MediaKind; caption?: string; fileName?: string },
): Promise<SendTextResult> {
  const conversation = await db.waConversation.findUnique({ where: { id: conversationId } });
  if (!conversation) return { success: false, error: "Conversa não encontrada." };
  if (conversation.optedOut) return { success: false, error: "Esse contato pediu para não receber mensagens. Se foi engano, reative nas opções do contato." };
  const result = await getWhatsAppProvider().sendMedia(conversation.phone, media);
  const now = new Date();
  const body = media.caption ?? "";
  if (!result.ok) {
    await db.waMessage.create({ data: { conversationId, direction: "out", body, mediaType: media.kind, mediaUrl: media.url, status: "failed", origin: "manual", error: result.error, createdAt: now } });
    return { success: false, error: result.error };
  }
  const message = await db.waMessage.upsert({
    where: { providerId: result.providerId },
    create: { conversationId, direction: "out", body, mediaType: media.kind, mediaUrl: media.url, providerId: result.providerId, status: "sent", origin: "manual", createdAt: now },
    update: { mediaType: media.kind, mediaUrl: media.url },
  });
  await db.waConversation.update({
    where: { id: conversationId },
    data: { lastMessageAt: now, lastPreview: messagePreview(body, media.kind), unreadCount: 0, lastDirection: "out" },
  });
  return { success: true, messageId: message.id };
}

export type StartConversationInput = { phone: string; name?: string; source: "entrada" | "prospeccao" | "cliente"; firstMessage?: string };

/** Abre (ou reaproveita) a conversa com um número e, se pedido, já manda a primeira mensagem. */
export async function startConversation(input: StartConversationInput): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const phone = normalizePhone(input.phone);
  if (!phone) return { success: false, error: "Telefone inválido. Use DDD + número, por exemplo (84) 99999-8888." };
  const name = input.name?.trim() || null;
  const conversation = await db.waConversation.upsert({
    where: { phone },
    create: { phone, name, source: input.source },
    update: name ? { name } : {},
  });
  if (input.firstMessage?.trim()) {
    const sent = await sendConversationText(conversation.id, input.firstMessage);
    if (!sent.success) return { success: false, error: sent.error };
  }
  return { success: true, id: conversation.id };
}

export type LeadUpdate = {
  name?: string | null;
  stage?: string;
  tags?: string[];
  notes?: string | null;
  source?: string;
  nextActionAt?: Date | null;
  nextActionNote?: string | null;
};

export async function updateLead(id: string, update: LeadUpdate): Promise<void> {
  if (update.stage !== undefined && !LEAD_STAGE_KEYS.includes(update.stage)) throw new Error("Etapa inválida.");
  await db.waConversation.update({
    where: { id },
    data: {
      ...(update.name !== undefined ? { name: update.name?.trim() || null } : {}),
      ...(update.stage !== undefined ? { stage: update.stage } : {}),
      ...(update.tags !== undefined ? { tags: update.tags } : {}),
      ...(update.notes !== undefined ? { notes: update.notes?.trim() || null } : {}),
      ...(update.source !== undefined ? { source: update.source } : {}),
      ...(update.nextActionAt !== undefined ? { nextActionAt: update.nextActionAt } : {}),
      ...(update.nextActionNote !== undefined ? { nextActionNote: update.nextActionNote?.trim() || null } : {}),
    },
  });
}

/** Ação em lote: muda a etapa e/ou acrescenta uma etiqueta em vários contatos de uma vez. */
export async function bulkUpdateConversations(ids: string[], change: { stage?: string; addTag?: string }): Promise<number> {
  if (change.stage !== undefined && !LEAD_STAGE_KEYS.includes(change.stage)) throw new Error("Etapa inválida.");
  let updated = 0;
  if (change.stage) updated = (await db.waConversation.updateMany({ where: { id: { in: ids } }, data: { stage: change.stage } })).count;
  if (change.addTag) {
    const tag = change.addTag.trim().toLowerCase().slice(0, 40);
    if (tag) {
      const rows = await db.waConversation.findMany({ where: { id: { in: ids } }, select: { id: true, tags: true } });
      for (const row of rows) if (!row.tags.includes(tag)) await db.waConversation.update({ where: { id: row.id }, data: { tags: [...row.tags, tag] } });
      updated = Math.max(updated, rows.length);
    }
  }
  return updated;
}

export async function markConversationRead(id: string): Promise<void> {
  await db.waConversation.updateMany({ where: { id, unreadCount: { gt: 0 } }, data: { unreadCount: 0 } });
}

/** Marca/desmarca "não quer receber". Ao marcar, as cadências ativas do contato são paradas. */
export async function setConversationOptOut(id: string, optedOut: boolean): Promise<void> {
  await db.$transaction([
    db.waConversation.update({ where: { id }, data: { optedOut } }),
    ...(optedOut
      ? [db.waEnrollment.updateMany({ where: { conversationId: id, status: "ativa" }, data: { status: "parada", stopReason: "pediu para sair", nextRunAt: null } })]
      : []),
  ]);
}

/** Orçamento enviado pela conversa: lead que ainda estava no começo do funil passa para "Proposta enviada" e ganha a etiqueta "orçamento". */
export async function registerQuoteSent(conversationId: string): Promise<void> {
  const conversation = await db.waConversation.findUnique({ where: { id: conversationId }, select: { stage: true, tags: true } });
  if (!conversation) return;
  await db.waConversation.update({
    where: { id: conversationId },
    data: {
      ...(["novo", "contato", "interessado"].includes(conversation.stage) ? { stage: "proposta" } : {}),
      ...(conversation.tags.includes("orçamento") ? {} : { tags: [...conversation.tags, "orçamento"] }),
    },
  });
}

/** Aprovou/recusou um orçamento: se esse telefone tem conversa, o lead vai para "Ganho" ou "Perdido" sozinho. */
export async function syncStageFromQuote(phone: string | null | undefined, stage: "ganho" | "perdido"): Promise<void> {
  const normalized = normalizePhone(phone);
  if (!normalized) return;
  await db.waConversation.updateMany({ where: { phone: normalized }, data: { stage } });
}

/** Id da conversa de um telefone (para ligar o orçamento à conversa), se existir. */
export async function findConversationIdByPhone(phone: string | null | undefined): Promise<string | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const row = await db.waConversation.findUnique({ where: { phone: normalized }, select: { id: true } });
  return row?.id ?? null;
}
