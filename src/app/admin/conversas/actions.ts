"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { withMutationFallback } from "@/lib/db-fallback";
import { logAdminAction } from "@/server/audit";
import { CONVERSATION_SOURCES, LEAD_STAGE_KEYS, normalizePhone } from "@/lib/whatsapp";
import { getWhatsAppProvider } from "@/server/whatsapp/provider";
import { db } from "@/server/db";
import {
  markConversationRead,
  recordInboundMessage,
  sendConversationText,
  setConversationOptOut,
  startConversation,
  updateLead,
} from "@/server/repositories/whatsapp-repository";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

const DENIED = { success: false as const, error: "Acesso restrito ao administrador." };
const refresh = () => revalidatePath("/admin/conversas");

export async function sendMessageAction(conversationId: string, text: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(async () => sendConversationText(conversationId, text, { origin: "manual" }));
  refresh();
  return result.success ? { success: true } : result;
}

export async function startConversationAction(input: {
  phone: string;
  name?: string;
  source: string;
  firstMessage?: string;
}): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const source = CONVERSATION_SOURCES.find((s) => s.key === input.source)?.key ?? "prospeccao";
  const result = await withMutationFallback(() => startConversation({ phone: input.phone, name: input.name, source, firstMessage: input.firstMessage }));
  if (result.success) {
    await logAdminAction("whatsapp.conversa", "WaConversation", result.id, { origem: source });
    refresh();
  }
  return result;
}

export async function updateLeadAction(
  id: string,
  update: { name?: string; stage?: string; tagsRaw?: string; notes?: string; source?: string },
): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  if (update.stage !== undefined && !LEAD_STAGE_KEYS.includes(update.stage)) return { success: false, error: "Etapa inválida." };
  if ((update.notes?.length ?? 0) > 4000 || (update.name?.length ?? 0) > 120) return { success: false, error: "Texto grande demais." };
  const tags = update.tagsRaw === undefined ? undefined : [...new Set(update.tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 20);
  const source = update.source === undefined ? undefined : CONVERSATION_SOURCES.find((s) => s.key === update.source)?.key;
  const result = await withMutationFallback(async () => {
    await updateLead(id, { name: update.name, stage: update.stage, tags, notes: update.notes, source });
    return { success: true as const };
  });
  if (result.success) refresh();
  return result;
}

export async function markReadAction(id: string): Promise<void> {
  if (!(await requireAdmin())) return;
  try {
    await markConversationRead(id);
    revalidatePath("/admin", "layout");
  } catch {
    // marcar como lida é só conveniência
  }
}

export async function setOptOutAction(id: string, optedOut: boolean): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(async () => {
    await setConversationOptOut(id, optedOut);
    return { success: true as const };
  });
  if (result.success) {
    await logAdminAction(optedOut ? "whatsapp.optout" : "whatsapp.optin", "WaConversation", id);
    refresh();
  }
  return result;
}

/** Só no modo simulação: finge que o contato respondeu, para testar o painel sem o WhatsApp conectado. */
export async function simulateInboundAction(conversationId: string, text: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  if (getWhatsAppProvider().name !== "simulador") return { success: false, error: "A simulação só funciona antes de conectar o WhatsApp." };
  const body = text.trim();
  if (!body) return { success: false, error: "Escreva a mensagem do contato." };
  const result = await withMutationFallback(async () => {
    const conversation = await db.waConversation.findUnique({ where: { id: conversationId }, select: { phone: true, name: true } });
    if (!conversation) return { success: false as const, error: "Conversa não encontrada." };
    await recordInboundMessage({
      phone: normalizePhone(conversation.phone) ?? conversation.phone,
      name: conversation.name,
      fromMe: false,
      text: body,
      mediaType: null,
      providerId: `sim-in-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      at: new Date(),
    });
    return { success: true as const };
  });
  if (result.success) {
    refresh();
    revalidatePath("/admin", "layout");
  }
  return result;
}

