"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { withMutationFallback } from "@/lib/db-fallback";
import { logAdminAction } from "@/server/audit";
import { db } from "@/server/db";
import { hasAudience, normalizeAudience, normalizeSendDays, normalizeSteps, normalizeWindow } from "@/lib/wa-cadence";
import {
  applyAudience,
  previewAudience,
  MAX_IMPORT_ROWS,
  deleteCadence,
  enrollConversations,
  importContacts,
  postponeEnrollment,
  resumeEnrollment,
  sendEnrollmentNow,
  stopManyEnrollments,
  type ProcessOutcome,
  runCadenceTick,
  saveCadence,
  saveWaConfig,
  stopEnrollment,
  type EnrollResult,
  type ImportResult,
  type TickResult,
  type WaConfigView,
} from "@/server/repositories/wa-cadence-repository";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

const DENIED = { success: false as const, error: "Acesso restrito ao administrador." };
const refresh = () => {
  revalidatePath("/admin/conversas", "layout");
};

export async function saveCadenceAction(
  id: string | null,
  input: {
    name: string;
    kind: string;
    active: boolean;
    steps: unknown;
    sendDays?: number[];
    windowStartHour?: number | null;
    windowEndHour?: number | null;
    autoEnroll?: boolean;
    audience?: unknown;
    repeatAfterDays?: number | null;
  },
): Promise<{ success: true; id: string } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const name = input.name.trim();
  if (name.length < 2 || name.length > 80) return { success: false, error: "Dê um nome para a cadência (até 80 letras)." };
  const steps = normalizeSteps(input.steps);
  if (!steps.ok) return { success: false, error: steps.error };
  const audience = normalizeAudience(input.audience);
  const autoEnroll = Boolean(input.autoEnroll);
  if (autoEnroll && !hasAudience(audience)) return { success: false, error: "Para colocar contatos automaticamente, escolha para quem vale (contatos das conversas e/ou clientes parados)." };
  const repeat = Number(input.repeatAfterDays);
  const repeatAfterDays = Number.isInteger(repeat) && repeat >= 1 && repeat <= 730 ? repeat : null;
  const result = await withMutationFallback(async () => ({
    success: true as const,
    id: await saveCadence(id, {
      name,
      kind: input.kind,
      active: input.active,
      steps: steps.steps,
      schedule: { sendDays: normalizeSendDays(input.sendDays), ...normalizeWindow(input.windowStartHour, input.windowEndHour) },
      autoEnroll,
      audience,
      repeatAfterDays,
    }),
  }));
  if (result.success) {
    await logAdminAction(id ? "whatsapp.cadencia.editar" : "whatsapp.cadencia.criar", "WaCadence", result.id, { nome: name });
    refresh();
  }
  return result;
}

export async function setCadenceActiveAction(id: string, active: boolean): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(async () => {
    await db.waCadence.update({ where: { id }, data: { active } });
    return { success: true as const };
  });
  if (result.success) refresh();
  return result;
}

export async function deleteCadenceAction(id: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(async () => {
    await deleteCadence(id);
    return { success: true as const };
  });
  if (result.success) {
    await logAdminAction("whatsapp.cadencia.excluir", "WaCadence", id);
    refresh();
  }
  return result;
}

export async function saveWaConfigAction(input: Partial<WaConfigView>): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const clean: Partial<WaConfigView> = {};
  if (typeof input.autoSendEnabled === "boolean") clean.autoSendEnabled = input.autoSendEnabled;
  if (input.dailyLimit !== undefined) clean.dailyLimit = Math.round(Number(input.dailyLimit));
  if (input.windowStartHour !== undefined) clean.windowStartHour = Math.round(Number(input.windowStartHour));
  if (input.windowEndHour !== undefined) clean.windowEndHour = Math.round(Number(input.windowEndHour));
  const result = await withMutationFallback(async () => {
    try {
      await saveWaConfig(clean);
      return { success: true as const };
    } catch (error) {
      return { success: false as const, error: error instanceof Error ? error.message : "Não foi possível salvar." };
    }
  });
  if (result.success) {
    await logAdminAction("whatsapp.config", "WaConfig", "1", clean as Record<string, unknown>);
    refresh();
  }
  return result;
}

/** "Rodar agora": faz uma rodada na hora, com as mesmas travas do envio automático (ligado, horário e limite do dia). */
export async function runCadencesNowAction(): Promise<{ success: true; result: TickResult } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(async () => ({ success: true as const, result: await runCadenceTick() }));
  if (result.success) refresh();
  return result;
}

export async function enrollConversationAction(cadenceId: string, conversationId: string): Promise<{ success: true; result: EnrollResult } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(async () => {
    try {
      return { success: true as const, result: await enrollConversations(cadenceId, [conversationId]) };
    } catch (error) {
      return { success: false as const, error: error instanceof Error ? error.message : "Não foi possível colocar na cadência." };
    }
  });
  if (result.success) refresh();
  return result;
}

export async function stopEnrollmentAction(id: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(async () => {
    await stopEnrollment(id);
    return { success: true as const };
  });
  if (result.success) refresh();
  return result;
}

export async function importContactsAction(input: {
  rows: { name: string; phone: string }[];
  listName?: string;
  cadenceId?: string;
  skipExisting: boolean;
}): Promise<{ success: true; result: ImportResult } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  if (!Array.isArray(input.rows) || input.rows.length === 0) return { success: false, error: "A lista está vazia." };
  if (input.rows.length > MAX_IMPORT_ROWS) return { success: false, error: `Máximo de ${MAX_IMPORT_ROWS} contatos por importação. Divida a planilha em partes.` };
  const result = await withMutationFallback(async () => {
    try {
      return { success: true as const, result: await importContacts({ ...input, cadenceId: input.cadenceId || undefined }) };
    } catch (error) {
      return { success: false as const, error: error instanceof Error ? error.message : "Não foi possível importar." };
    }
  });
  if (result.success) {
    await logAdminAction("whatsapp.importar", "WaConversation", "lista", {
      lista: input.listName ?? "",
      criados: result.result.created,
      inscritos: result.result.enrolled,
    });
    refresh();
  }
  return result;
}

/** "Enviar agora": manda já a próxima mensagem dessa inscrição, sem esperar o horário (contato que respondeu ou saiu não recebe). */
export async function sendEnrollmentNowAction(id: string): Promise<{ success: true; outcome: ProcessOutcome } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(() => sendEnrollmentNow(id));
  if (result.success) {
    await logAdminAction("whatsapp.cadencia.enviar-agora", "WaEnrollment", id, { resultado: result.outcome });
    refresh();
  }
  return result;
}

export async function postponeEnrollmentAction(id: string, hours: number): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const safeHours = Math.min(24 * 30, Math.max(1, Math.round(Number(hours) || 24)));
  const result = await withMutationFallback(async () => {
    try {
      await postponeEnrollment(id, safeHours);
      return { success: true as const };
    } catch (error) {
      return { success: false as const, error: error instanceof Error ? error.message : "Não foi possível adiar." };
    }
  });
  if (result.success) refresh();
  return result;
}

export async function resumeEnrollmentAction(id: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(async () => {
    try {
      await resumeEnrollment(id);
      return { success: true as const };
    } catch (error) {
      return { success: false as const, error: error instanceof Error ? error.message : "Não foi possível retomar." };
    }
  });
  if (result.success) refresh();
  return result;
}

export async function stopManyEnrollmentsAction(ids: string[]): Promise<{ success: true; stopped: number } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const clean = [...new Set((Array.isArray(ids) ? ids : []).filter((id) => typeof id === "string" && id.length > 0 && id.length < 80))].slice(0, 500);
  if (clean.length === 0) return { success: false, error: "Nenhuma inscrição selecionada." };
  const result = await withMutationFallback(async () => ({ success: true as const, stopped: await stopManyEnrollments(clean) }));
  if (result.success) {
    await logAdminAction("whatsapp.cadencia.cancelar-varios", "WaEnrollment", "varios", { cancelados: result.stopped });
    refresh();
  }
  return result;
}

/** "Ver quem entraria agora" com o público do formulário (mesmo antes de salvar). Não grava nada. */
export async function previewAudienceAction(input: {
  id: string | null;
  audience: unknown;
  repeatAfterDays: number | null;
}): Promise<{ success: true; count: number; sample: string[]; restarting: number } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const audience = normalizeAudience(input.audience);
  if (!hasAudience(audience)) return { success: false, error: "Escolha para quem vale antes de conferir." };
  const repeat = Number(input.repeatAfterDays);
  const result = await withMutationFallback(async () => {
    const preview = await previewAudience({ id: input.id ?? "novo", audience, repeatAfterDays: Number.isInteger(repeat) && repeat >= 1 ? repeat : null });
    return { success: true as const, ...preview };
  });
  return result;
}

/** "Colocar agora": inscreve quem combina com o público salvo da cadência (até 100 por vez). Enviar continua dependendo do envio automático. */
export async function applyAudienceAction(id: string): Promise<{ success: true; enrolled: number } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const result = await withMutationFallback(async () => {
    try {
      return { success: true as const, enrolled: await applyAudience(id) };
    } catch (error) {
      return { success: false as const, error: error instanceof Error ? error.message : "Não foi possível colocar os contatos." };
    }
  });
  if (result.success) {
    await logAdminAction("whatsapp.cadencia.aplicar-publico", "WaCadence", id, { inscritos: result.enrolled });
    refresh();
  }
  return result;
}
