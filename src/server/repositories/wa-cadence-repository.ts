import { db } from "../db";
import { sendConversationText } from "./whatsapp-repository";
import { getAllCustomers } from "./customer-repository";
import { phoneKey } from "@/lib/customer-insights";
import { storeDayKey } from "@/lib/store-time";
import { normalizePhone } from "@/lib/whatsapp";
import {
  CADENCE_KINDS,
  effectiveDailyLimit,
  isWithinSendWindow,
  normalizeSteps,
  renderMessage,
  type CadenceStep,
} from "@/lib/wa-cadence";

/* ---------- configuração do envio automático ---------- */

export type WaConfigView = { autoSendEnabled: boolean; dailyLimit: number; windowStartHour: number; windowEndHour: number };
const DEFAULT_CONFIG: WaConfigView = { autoSendEnabled: false, dailyLimit: 100, windowStartHour: 8, windowEndHour: 18 };

export async function getWaConfig(): Promise<WaConfigView> {
  const row = await db.waConfig.findUnique({ where: { id: 1 } });
  return row
    ? { autoSendEnabled: row.autoSendEnabled, dailyLimit: row.dailyLimit, windowStartHour: row.windowStartHour, windowEndHour: row.windowEndHour }
    : DEFAULT_CONFIG;
}

export async function saveWaConfig(input: Partial<WaConfigView>): Promise<WaConfigView> {
  const current = await getWaConfig();
  const next = { ...current, ...input };
  if (!Number.isInteger(next.dailyLimit) || next.dailyLimit < 1 || next.dailyLimit > 500) throw new Error("O limite diário deve ficar entre 1 e 500.");
  if (!Number.isInteger(next.windowStartHour) || !Number.isInteger(next.windowEndHour) || next.windowStartHour < 0 || next.windowEndHour > 24 || next.windowStartHour >= next.windowEndHour) {
    throw new Error("A janela de envio é inválida: o início precisa ser antes do fim.");
  }
  await db.waConfig.upsert({ where: { id: 1 }, create: { id: 1, ...next }, update: next });
  return next;
}

function startOfStoreDay(now: Date) {
  // O fuso da loja é UTC-3 fixo: meia-noite local = 03:00 UTC.
  return new Date(`${storeDayKey(now)}T03:00:00.000Z`);
}

export type SendBudget = { limit: number; sentToday: number; remaining: number };

/** Quantas mensagens automáticas ainda podem sair hoje (teto configurado com aquecimento gradual do número). */
export async function getSendBudget(now = new Date(), config?: WaConfigView): Promise<SendBudget> {
  const cfg = config ?? (await getWaConfig());
  const automated = { direction: "out", origin: { in: ["cadencia", "campanha"] }, status: { not: "failed" } };
  const [sentToday, first] = await Promise.all([
    db.waMessage.count({ where: { ...automated, createdAt: { gte: startOfStoreDay(now) } } }),
    db.waMessage.findFirst({ where: automated, orderBy: { createdAt: "asc" }, select: { createdAt: true } }),
  ]);
  const limit = effectiveDailyLimit(cfg.dailyLimit, first ? storeDayKey(first.createdAt) : null, storeDayKey(now));
  return { limit, sentToday, remaining: Math.max(0, limit - sentToday) };
}

/* ---------- cadências ---------- */

export type CadenceCounts = { ativa: number; concluida: number; parada: number };
export type CadenceView = {
  id: string;
  name: string;
  kind: string;
  active: boolean;
  steps: CadenceStep[];
  counts: CadenceCounts;
  createdAt: string;
};

function toCadence(row: { id: string; name: string; kind: string; active: boolean; steps: unknown; createdAt: Date }, counts: CadenceCounts): CadenceView {
  const parsed = normalizeSteps(row.steps);
  return { id: row.id, name: row.name, kind: row.kind, active: row.active, steps: parsed.ok ? parsed.steps : [], counts, createdAt: row.createdAt.toISOString() };
}

export async function listCadences(): Promise<CadenceView[]> {
  const [rows, grouped] = await Promise.all([
    db.waCadence.findMany({ orderBy: { createdAt: "desc" } }),
    db.waEnrollment.groupBy({ by: ["cadenceId", "status"], _count: { _all: true } }),
  ]);
  return rows.map((row) => {
    const counts: CadenceCounts = { ativa: 0, concluida: 0, parada: 0 };
    for (const g of grouped) if (g.cadenceId === row.id && g.status in counts) counts[g.status as keyof CadenceCounts] = g._count._all;
    return toCadence(row, counts);
  });
}

export async function getCadence(id: string): Promise<CadenceView | null> {
  const row = await db.waCadence.findUnique({ where: { id } });
  if (!row) return null;
  const grouped = await db.waEnrollment.groupBy({ by: ["status"], where: { cadenceId: id }, _count: { _all: true } });
  const counts: CadenceCounts = { ativa: 0, concluida: 0, parada: 0 };
  for (const g of grouped) if (g.status in counts) counts[g.status as keyof CadenceCounts] = g._count._all;
  return toCadence(row, counts);
}

export type CadenceInput = { name: string; kind: string; active: boolean; steps: CadenceStep[] };

export async function saveCadence(id: string | null, input: CadenceInput): Promise<string> {
  const kind = CADENCE_KINDS.some((k) => k.key === input.kind) ? input.kind : "personalizada";
  const data = { name: input.name.trim(), kind, active: input.active, steps: input.steps };
  if (id) {
    await db.waCadence.update({ where: { id }, data });
    return id;
  }
  return (await db.waCadence.create({ data })).id;
}

export async function deleteCadence(id: string): Promise<void> {
  await db.waCadence.delete({ where: { id } });
}

export type EnrollmentView = {
  id: string;
  cadenceId: string;
  cadenceName: string;
  conversationId: string;
  name: string | null;
  phone: string;
  stepIndex: number;
  totalSteps: number;
  nextRunAt: string | null;
  status: string;
  stopReason: string | null;
};

export async function listCadenceEnrollments(cadenceId: string, limit = 300): Promise<EnrollmentView[]> {
  const rows = await db.waEnrollment.findMany({
    where: { cadenceId },
    include: { cadence: { select: { name: true, steps: true } }, conversation: { select: { name: true, phone: true } } },
    orderBy: [{ status: "asc" }, { nextRunAt: "asc" }],
    take: limit,
  });
  return rows.map(toEnrollment);
}

export async function listConversationEnrollments(conversationId: string): Promise<EnrollmentView[]> {
  const rows = await db.waEnrollment.findMany({
    where: { conversationId },
    include: { cadence: { select: { name: true, steps: true } }, conversation: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toEnrollment);
}

function toEnrollment(row: {
  id: string;
  cadenceId: string;
  conversationId: string;
  stepIndex: number;
  nextRunAt: Date | null;
  status: string;
  stopReason: string | null;
  cadence: { name: string; steps: unknown };
  conversation: { name: string | null; phone: string };
}): EnrollmentView {
  const steps = normalizeSteps(row.cadence.steps);
  return {
    id: row.id,
    cadenceId: row.cadenceId,
    cadenceName: row.cadence.name,
    conversationId: row.conversationId,
    name: row.conversation.name,
    phone: row.conversation.phone,
    stepIndex: row.stepIndex,
    totalSteps: steps.ok ? steps.steps.length : 0,
    nextRunAt: row.nextRunAt?.toISOString() ?? null,
    status: row.status,
    stopReason: row.stopReason,
  };
}

export type EnrollResult = { enrolled: number; alreadyIn: number; optedOut: number };

/** Coloca conversas numa cadência. Quem pediu para sair e quem já passou por ela (em andamento, concluída ou parada) fica de fora. */
export async function enrollConversations(cadenceId: string, conversationIds: string[], now = new Date()): Promise<EnrollResult> {
  const cadence = await db.waCadence.findUnique({ where: { id: cadenceId } });
  if (!cadence) throw new Error("Cadência não encontrada.");
  const parsed = normalizeSteps(cadence.steps);
  if (!parsed.ok) throw new Error("A cadência não tem mensagens válidas.");

  const [conversations, existing] = await Promise.all([
    db.waConversation.findMany({ where: { id: { in: conversationIds } }, select: { id: true, optedOut: true } }),
    db.waEnrollment.findMany({ where: { cadenceId, conversationId: { in: conversationIds } }, select: { conversationId: true } }),
  ]);
  const already = new Set(existing.map((e) => e.conversationId));
  const eligible = conversations.filter((c) => !c.optedOut && !already.has(c.id));
  const nextRunAt = new Date(now.getTime() + parsed.steps[0].delayHours * 3_600_000);
  if (eligible.length > 0) {
    await db.waEnrollment.createMany({
      data: eligible.map((c) => ({ cadenceId, conversationId: c.id, stepIndex: 0, nextRunAt, status: "ativa" })),
      skipDuplicates: true,
    });
  }
  return { enrolled: eligible.length, alreadyIn: conversations.filter((c) => already.has(c.id)).length, optedOut: conversations.filter((c) => c.optedOut).length };
}

export async function stopEnrollment(id: string, reason = "parada manualmente"): Promise<void> {
  await db.waEnrollment.updateMany({ where: { id, status: "ativa" }, data: { status: "parada", stopReason: reason, nextRunAt: null } });
}

/* ---------- importação de lista ---------- */

export type ImportInput = {
  rows: { name: string; phone: string }[];
  listName?: string;
  cadenceId?: string;
  /** Pula quem já tem conversa ou já é cliente (recomendado: evita escrever em frio para quem já é conhecido). */
  skipExisting: boolean;
};
export type ImportResult = {
  received: number;
  invalid: number;
  duplicates: number;
  created: number;
  alreadyHadConversation: number;
  skippedCustomers: number;
  optedOut: number;
  enrolled: number;
};

export const MAX_IMPORT_ROWS = 3000;

export async function importContacts(input: ImportInput, now = new Date()): Promise<ImportResult> {
  const result: ImportResult = { received: input.rows.length, invalid: 0, duplicates: 0, created: 0, alreadyHadConversation: 0, skippedCustomers: 0, optedOut: 0, enrolled: 0 };

  // Nunca confiamos no que veio do navegador: telefones são normalizados e repetidos removidos aqui também.
  const unique = new Map<string, string>();
  for (const row of input.rows) {
    const phone = normalizePhone(String(row.phone ?? ""));
    if (!phone) {
      result.invalid += 1;
      continue;
    }
    if (unique.has(phone)) {
      result.duplicates += 1;
      continue;
    }
    unique.set(phone, String(row.name ?? "").trim().slice(0, 120));
  }
  const phones = [...unique.keys()];
  if (phones.length === 0) return result;

  const tag = input.listName?.trim().toLowerCase().slice(0, 40);
  const [existing, customers] = await Promise.all([
    db.waConversation.findMany({ where: { phone: { in: phones } }, select: { id: true, phone: true, optedOut: true } }),
    getAllCustomers().catch(() => []),
  ]);
  const existingByPhone = new Map(existing.map((c) => [c.phone, c]));
  const customerKeys = new Set(customers.map((c) => phoneKey(c.phone)));

  const toCreate: { phone: string; name: string | null }[] = [];
  const enrollIds: string[] = [];
  for (const phone of phones) {
    const found = existingByPhone.get(phone);
    if (found) {
      result.alreadyHadConversation += 1;
      if (found.optedOut) result.optedOut += 1;
      else if (!input.skipExisting) enrollIds.push(found.id);
      continue;
    }
    if (input.skipExisting && customerKeys.has(phoneKey(phone))) {
      result.skippedCustomers += 1;
      continue;
    }
    toCreate.push({ phone, name: unique.get(phone) || null });
  }

  if (toCreate.length > 0) {
    const created = await db.waConversation.createMany({
      data: toCreate.map((c) => ({ phone: c.phone, name: c.name, source: "prospeccao", tags: tag ? [tag] : [] })),
      skipDuplicates: true,
    });
    result.created = created.count;
    const fresh = await db.waConversation.findMany({ where: { phone: { in: toCreate.map((c) => c.phone) } }, select: { id: true } });
    enrollIds.push(...fresh.map((c) => c.id));
  }

  if (input.cadenceId && enrollIds.length > 0) {
    const enrolled = await enrollConversations(input.cadenceId, enrollIds, now);
    result.enrolled = enrolled.enrolled;
  }
  return result;
}

/* ---------- motor: envia o que está na hora ---------- */

export type TickResult = { ran: boolean; reason?: string; sent: number; failed: number; stopped: number; remainingToday?: number };

const MAX_SENDS_PER_TICK = 3;
const RETRY_AFTER_MS = 30 * 60_000;
const MAX_ATTEMPTS = 3;

/**
 * Uma rodada do envio automático. Só envia com o envio ligado, dentro da janela de horário e abaixo do teto do dia; manda poucas
 * mensagens por rodada (o ritmo vem de rodar a cada ~10 minutos). Cada inscrição é "reservada" antes do envio, para duas rodadas
 * simultâneas nunca mandarem a mesma mensagem duas vezes.
 */
export async function runCadenceTick(now = new Date()): Promise<TickResult> {
  const empty = { sent: 0, failed: 0, stopped: 0 };
  const config = await getWaConfig();
  if (!config.autoSendEnabled) return { ran: false, reason: "O envio automático está desligado.", ...empty };
  if (!isWithinSendWindow(now, config.windowStartHour, config.windowEndHour)) {
    return { ran: false, reason: `Fora do horário de envio (segunda a sábado, ${config.windowStartHour}h às ${config.windowEndHour}h).`, ...empty };
  }
  const budget = await getSendBudget(now, config);
  if (budget.remaining <= 0) return { ran: false, reason: `O limite de hoje (${budget.limit}) já foi atingido.`, ...empty, remainingToday: 0 };

  const due = await db.waEnrollment.findMany({
    where: { status: "ativa", nextRunAt: { lte: now }, cadence: { active: true } },
    include: { cadence: true },
    orderBy: { nextRunAt: "asc" },
    take: Math.min(budget.remaining, MAX_SENDS_PER_TICK),
  });

  const result: TickResult = { ran: true, ...empty };
  for (const enrollment of due) {
    // Reserva: só quem conseguir adiantar o horário desta inscrição envia.
    const claim = await db.waEnrollment.updateMany({
      where: { id: enrollment.id, status: "ativa", nextRunAt: { lte: now } },
      data: { nextRunAt: new Date(now.getTime() + 10 * 60_000) },
    });
    if (claim.count !== 1) continue;

    const stop = async (reason: string) => {
      await db.waEnrollment.update({ where: { id: enrollment.id }, data: { status: "parada", stopReason: reason, nextRunAt: null } });
      result.stopped += 1;
    };

    const conversation = await db.waConversation.findUnique({ where: { id: enrollment.conversationId } });
    if (!conversation || conversation.optedOut) {
      await stop("pediu para sair");
      continue;
    }
    if (conversation.lastInboundAt && conversation.lastInboundAt > enrollment.createdAt) {
      await stop("respondeu");
      continue;
    }
    const parsed = normalizeSteps(enrollment.cadence.steps);
    if (!parsed.ok) {
      await stop("cadência sem mensagens válidas");
      continue;
    }
    const step = parsed.steps[enrollment.stepIndex];
    if (!step) {
      await db.waEnrollment.update({ where: { id: enrollment.id }, data: { status: "concluida", nextRunAt: null } });
      continue;
    }

    const text = renderMessage(step.text, conversation);
    const sent = await sendConversationText(conversation.id, text, { origin: "cadencia", delayMs: 1500 + Math.floor(Math.random() * 2500) });
    if (!sent.success) {
      result.failed += 1;
      const attempts = enrollment.attempts + 1;
      if (attempts >= MAX_ATTEMPTS) await stop("falha no envio");
      else await db.waEnrollment.update({ where: { id: enrollment.id }, data: { attempts, nextRunAt: new Date(now.getTime() + RETRY_AFTER_MS) } });
      continue;
    }

    result.sent += 1;
    if (conversation.stage === "novo") await db.waConversation.update({ where: { id: conversation.id }, data: { stage: "contato" } });
    const nextStep = parsed.steps[enrollment.stepIndex + 1];
    await db.waEnrollment.update({
      where: { id: enrollment.id },
      data: nextStep
        ? { stepIndex: enrollment.stepIndex + 1, attempts: 0, nextRunAt: new Date(now.getTime() + nextStep.delayHours * 3_600_000) }
        : { stepIndex: enrollment.stepIndex + 1, attempts: 0, status: "concluida", nextRunAt: null },
    });
  }
  result.remainingToday = budget.remaining - result.sent;
  return result;
}
