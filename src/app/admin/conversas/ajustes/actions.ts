"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { withMutationFallback } from "@/lib/db-fallback";
import { logAdminAction } from "@/server/audit";
import { deleteQuickReply, saveQuickReply } from "@/server/repositories/wa-quick-reply-repository";
import { saveAutomationSettings, type WaAutomationSettings } from "@/server/repositories/wa-settings-repository";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

const DENIED = { success: false as const, error: "Acesso restrito ao administrador." };
const refresh = () => revalidatePath("/admin/conversas", "layout");

export async function saveQuickReplyAction(
  id: string | null,
  input: { title: string; shortcut?: string; body: string },
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(() => saveQuickReply(id, input));
  if (result.success) refresh();
  return result;
}

export async function deleteQuickReplyAction(id: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(async () => {
    await deleteQuickReply(id);
    return { success: true as const };
  });
  if (result.success) refresh();
  return result;
}

export async function saveAutomationAction(input: WaAutomationSettings): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  if (input.awayEnabled && !input.awayText.trim()) return { success: false, error: "Escreva a mensagem de fora do horário." };
  if (input.greetingEnabled && !input.greetingText.trim()) return { success: false, error: "Escreva a mensagem de boas-vindas." };
  const result = await withMutationFallback(async () => {
    await saveAutomationSettings(input);
    return { success: true as const };
  });
  if (result.success) {
    await logAdminAction("whatsapp.ajustes", "WaConfig", "1", { fora: input.awayEnabled, saudacao: input.greetingEnabled, pedidos: input.orderNotifyEnabled });
    refresh();
  }
  return result;
}
