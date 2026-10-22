import { db } from "../db";
import { sendConversationText } from "./whatsapp-repository";
import { getAllCustomers, getCustomersWithMetrics, markCustomerReminded } from "./customer-repository";
import { isInactive, phoneKey, wasRecentlyReminded } from "@/lib/customer-insights";
import { storeDayKey } from "@/lib/store-time";
import { normalizePhone } from "@/lib/whatsapp";
import {
  CADENCE_KINDS,
  canRepeat,
  effectiveDailyLimit,
  hasAudience,
  isWithinSchedule,
  normalizeAudience,
  normalizeSendDays,
  normalizeSteps,
  renderMessage,
  type CadenceAudience,
  type CadenceSchedule,
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
  schedule: CadenceSchedule;
  autoEnroll: boolean;
  audience: CadenceAudience;
  repeatAfterDays: number | null;
  counts: CadenceCounts;
  createdAt: string;
};

type CadenceRow = {
  id: string;
  name: string;
  kind: string;
  active: boolean;
  steps: unknown;
  sendDays: number[];
  windowStartHour: number | null;
  windowEndHour: number | null;
  autoEnroll: boolean;
  audience: unknown;
  repeatAfterDays: number | null;
  createdAt: Date;
};

const scheduleOf = (row: Pick<CadenceRow, "sendDays" | "windowStartHour" | "windowEndHour">): CadenceSchedule => ({
  sendDays: normalizeSendDays(row.sendDays),
  windowStartHour: row.windowStartHour,
  windowEndHour: row.windowEndHour,
});

function toCadence(row: CadenceRow, counts: CadenceCounts): CadenceView {
  const parsed = normalizeSteps(row.steps);
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    active: row.active,
    steps: parsed.ok ? parsed.steps : [],
    schedule: scheduleOf(row),
    autoEnroll: row.autoEnroll,
    audience: normalizeAudience(row.audience),
    repeatAfterDays: row.repeatAfterDays,
    counts,
    createdAt: row.createdAt.toISOString(),
  };
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

export type CadenceInput = {
  name: string;
  kind: string;
  active: boolean;
  steps: CadenceStep[];
  schedule: CadenceSchedule;
  autoEnroll: boolean;
  audience: CadenceAudience;
  repeatAfterDays: number | null;
};

export async function saveCadence(id: string | null, input: CadenceInput): Promise<string> {
  const kind = CADENCE_KINDS.some((k) => k.key === input.kind) ? input.kind : "personalizada";
  const data = {
    name: input.name.trim(),
    kind,
    active: input.active,
    steps: input.steps,
    sendDays: input.schedule.sendDays,
    windowStartHour: input.schedule.windowStartHour,
    windowEndHour: input.schedule.windowEndHour,
    autoEnroll: input.autoEnroll,
    audience: input.audience,
    repeatAfterDays: input.repeatAfterDays,
  };
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

export type TickResult = { ran: boolean; reason?: string; sent: number; failed: number; stopped: number; enrolled?: number; remainingToday?: number };

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

  // Quem combina com as regras de "para quem" entra na cadência sozinho (mesmo fora do horário: entrar não envia nada).
  const enrolled = await runAutoEnroll(now);

  const budget = await getSendBudget(now, config);
  if (budget.remaining <= 0) return { ran: false, reason: `O limite de hoje (${budget.limit}) já foi atingido.`, ...empty, enrolled, remainingToday: 0 };

  const candidates = await db.waEnrollment.findMany({
    where: { status: "ativa", nextRunAt: { lte: now }, cadence: { active: true } },
    include: { cadence: true },
    orderBy: { nextRunAt: "asc" },
    take: 60,
  });
  // Cada cadência tem seus dias e horário (ou usa os gerais): só entra na rodada quem está dentro da própria agenda.
  const due = candidates.filter((e) => isWithinSchedule(now, scheduleOf(e.cadence), config)).slice(0, Math.min(budget.remaining, MAX_SENDS_PER_TICK));
  if (candidates.length > 0 && due.length === 0) {
    return { ran: false, reason: "Há mensagens na hora de sair, mas todas as cadências estão fora do dia ou do horário de envio delas.", ...empty, enrolled };
  }

  const result: TickResult = { ran: true, ...empty, enrolled };
  for (const enrollment of due) {
    const outcome = await processEnrollment(enrollment, now, { force: false });
    if (outcome === "sent") result.sent += 1;
    else if (outcome === "failed") result.failed += 1;
    else if (outcome === "stopped") result.stopped += 1;
  }
  result.remainingToday = budget.remaining - result.sent;
  return result;
}

export type ProcessOutcome = "sent" | "failed" | "stopped" | "concluded" | "skipped";

/**
 * Envia a próxima mensagem de uma inscrição (usado pela rodada automática e pelo "Enviar agora" da fila). Reserva a inscrição antes
 * de enviar, confere se o contato continua podendo receber (não pediu para sair, não respondeu) e só então avança para o passo seguinte.
 * `force` ignora o horário agendado (o "Enviar agora"); as travas de segurança do contato valem sempre.
 */
export async function processEnrollment(
  enrollment: { id: string; conversationId: string; stepIndex: number; attempts: number; createdAt: Date; cadence: { steps: unknown } },
  now: Date,
  options: { force: boolean },
): Promise<ProcessOutcome> {
  const claim = await db.waEnrollment.updateMany({
    where: { id: enrollment.id, status: "ativa", ...(options.force ? {} : { nextRunAt: { lte: now } }) },
    data: { nextRunAt: new Date(now.getTime() + 10 * 60_000) },
  });
  if (claim.count !== 1) return "skipped";

  const stop = async (reason: string): Promise<ProcessOutcome> => {
    await db.waEnrollment.update({ where: { id: enrollment.id }, data: { status: "parada", stopReason: reason, nextRunAt: null } });
    return "stopped";
  };

  const conversation = await db.waConversation.findUnique({ where: { id: enrollment.conversationId } });
  if (!conversation || conversation.optedOut) return stop("pediu para sair");
  if (conversation.lastInboundAt && conversation.lastInboundAt > enrollment.createdAt) return stop("respondeu");
  const parsed = normalizeSteps(enrollment.cadence.steps);
  if (!parsed.ok) return stop("cadência sem mensagens válidas");
  const step = parsed.steps[enrollment.stepIndex];
  if (!step) {
    await db.waEnrollment.update({ where: { id: enrollment.id }, data: { status: "concluida", finishedAt: now, nextRunAt: null } });
    return "concluded";
  }

  const text = renderMessage(step.text, conversation);
  const sent = await sendConversationText(conversation.id, text, { origin: "cadencia", delayMs: 1500 + Math.floor(Math.random() * 2500) });
  if (!sent.success) {
    const attempts = enrollment.attempts + 1;
    if (attempts >= MAX_ATTEMPTS) await stop("falha no envio");
    else await db.waEnrollment.update({ where: { id: enrollment.id }, data: { attempts, nextRunAt: new Date(now.getTime() + RETRY_AFTER_MS) } });
    return "failed";
  }

  if (conversation.stage === "novo") await db.waConversation.update({ where: { id: conversation.id }, data: { stage: "contato" } });
  const nextStep = parsed.steps[enrollment.stepIndex + 1];
  await db.waEnrollment.update({
    where: { id: enrollment.id },
    data: nextStep
      ? { stepIndex: enrollment.stepIndex + 1, attempts: 0, nextRunAt: new Date(now.getTime() + nextStep.delayHours * 3_600_000) }
      : { stepIndex: enrollment.stepIndex + 1, attempts: 0, status: "concluida", finishedAt: now, nextRunAt: null },
  });
  return "sent";
}

/* ---------- acompanhamento: fila, enviadas e encerradas ---------- */

export type QueueItem = {
  id: string;
  conversationId: string;
  name: string | null;
  phone: string;
  cadenceId: string;
  cadenceName: string;
  cadenceActive: boolean;
  stepIndex: number;
  totalSteps: number;
  nextText: string;
  nextRunAt: string | null;
  attempts: number;
};

export type QueueFilter = { cadenceId?: string; q?: string };

function enrollmentWhere(filter: QueueFilter) {
  const q = filter.q?.trim();
  const digits = q?.replace(/\D/g, "");
  return {
    ...(filter.cadenceId ? { cadenceId: filter.cadenceId } : {}),
    ...(q
      ? {
          conversation: {
            OR: [{ name: { contains: q, mode: "insensitive" as const } }, ...(digits && digits.length >= 4 ? [{ phone: { contains: digits } }] : [])],
          },
        }
      : {}),
  };
}

/** Quem ainda vai receber: inscrições ativas, da mais próxima para a mais distante. */
export async function listQueue(filter: QueueFilter = {}, limit = 300): Promise<QueueItem[]> {
  const rows = await db.waEnrollment.findMany({
    where: { status: "ativa", ...enrollmentWhere(filter) },
    include: { cadence: true, conversation: { select: { name: true, phone: true } } },
    orderBy: [{ nextRunAt: "asc" }, { createdAt: "asc" }],
    take: limit,
  });
  return rows.map((row) => {
    const parsed = normalizeSteps(row.cadence.steps);
    const steps = parsed.ok ? parsed.steps : [];
    const step = steps[row.stepIndex];
    return {
      id: row.id,
      conversationId: row.conversationId,
      name: row.conversation.name,
      phone: row.conversation.phone,
      cadenceId: row.cadenceId,
      cadenceName: row.cadence.name,
      cadenceActive: row.cadence.active,
      stepIndex: row.stepIndex,
      totalSteps: steps.length,
      nextText: step ? renderMessage(step.text, row.conversation, () => 0) : "",
      nextRunAt: row.nextRunAt?.toISOString() ?? null,
      attempts: row.attempts,
    };
  });
}

export type ClosedItem = {
  id: string;
  conversationId: string;
  name: string | null;
  phone: string;
  cadenceName: string;
  status: string;
  stopReason: string | null;
  stepIndex: number;
  totalSteps: number;
};

/** Cadências que já terminaram ou foram paradas. */
export async function listClosed(filter: QueueFilter = {}, limit = 300): Promise<ClosedItem[]> {
  const rows = await db.waEnrollment.findMany({
    where: { status: { in: ["concluida", "parada"] }, ...enrollmentWhere(filter) },
    include: { cadence: { select: { name: true, steps: true } }, conversation: { select: { name: true, phone: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((row) => {
    const parsed = normalizeSteps(row.cadence.steps);
    return {
      id: row.id,
      conversationId: row.conversationId,
      name: row.conversation.name,
      phone: row.conversation.phone,
      cadenceName: row.cadence.name,
      status: row.status,
      stopReason: row.stopReason,
      stepIndex: row.stepIndex,
      totalSteps: parsed.ok ? parsed.steps.length : 0,
    };
  });
}

export type SentItem = {
  id: string;
  conversationId: string;
  name: string | null;
  phone: string;
  body: string;
  status: string;
  origin: string;
  error: string | null;
  createdAt: string;
  /** O contato respondeu depois dessa mensagem. */
  replied: boolean;
};

/** Mensagens que o envio automático já mandou (mais recentes primeiro). */
export async function listSentAutomated(q?: string, limit = 200): Promise<SentItem[]> {
  const term = q?.trim();
  const digits = term?.replace(/\D/g, "");
  const rows = await db.waMessage.findMany({
    where: {
      direction: "out",
      origin: { in: ["cadencia", "campanha"] },
      ...(term
        ? { conversation: { OR: [{ name: { contains: term, mode: "insensitive" as const } }, ...(digits && digits.length >= 4 ? [{ phone: { contains: digits } }] : [])] } }
        : {}),
    },
    include: { conversation: { select: { name: true, phone: true, lastInboundAt: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    name: m.conversation.name,
    phone: m.conversation.phone,
    body: m.body,
    status: m.status,
    origin: m.origin,
    error: m.error,
    createdAt: m.createdAt.toISOString(),
    replied: Boolean(m.conversation.lastInboundAt && m.conversation.lastInboundAt > m.createdAt),
  }));
}

export type QueueStats = { queued: number; sentToday: number; concluded: number; stopped: number; replies: number };

export async function getQueueStats(now = new Date()): Promise<QueueStats> {
  const [grouped, sentToday, replies] = await Promise.all([
    db.waEnrollment.groupBy({ by: ["status"], _count: { _all: true } }),
    db.waMessage.count({ where: { direction: "out", origin: { in: ["cadencia", "campanha"] }, status: { not: "failed" }, createdAt: { gte: startOfStoreDay(now) } } }),
    db.waEnrollment.count({ where: { status: "parada", stopReason: "respondeu" } }),
  ]);
  const count = (s: string) => grouped.find((g) => g.status === s)?._count._all ?? 0;
  return { queued: count("ativa"), sentToday, concluded: count("concluida"), stopped: count("parada"), replies };
}

/** "Enviar agora": manda já a próxima mensagem da inscrição, sem esperar o horário (as travas do contato continuam valendo). */
export async function sendEnrollmentNow(id: string, now = new Date()): Promise<{ success: true; outcome: ProcessOutcome } | { success: false; error: string }> {
  const enrollment = await db.waEnrollment.findUnique({ where: { id }, include: { cadence: true } });
  if (!enrollment || enrollment.status !== "ativa") return { success: false, error: "Essa inscrição não está mais na fila." };
  const outcome = await processEnrollment(enrollment, now, { force: true });
  if (outcome === "skipped") return { success: false, error: "Esse envio já está sendo feito. Atualize a página." };
  return { success: true, outcome };
}

/** Empurra o próximo envio para frente (por padrão, 1 dia). */
export async function postponeEnrollment(id: string, hours = 24, now = new Date()): Promise<void> {
  const enrollment = await db.waEnrollment.findUnique({ where: { id }, select: { status: true, nextRunAt: true } });
  if (!enrollment || enrollment.status !== "ativa") throw new Error("Essa inscrição não está mais na fila.");
  const base = enrollment.nextRunAt && enrollment.nextRunAt > now ? enrollment.nextRunAt : now;
  await db.waEnrollment.update({ where: { id }, data: { nextRunAt: new Date(base.getTime() + hours * 3_600_000) } });
}

/** Volta a andar uma inscrição que foi parada à mão ou por falha de envio (não vale para quem respondeu ou pediu para sair). */
export async function resumeEnrollment(id: string, now = new Date()): Promise<void> {
  const enrollment = await db.waEnrollment.findUnique({ where: { id }, include: { conversation: { select: { optedOut: true } } } });
  if (!enrollment || enrollment.status !== "parada") throw new Error("Essa inscrição não está parada.");
  if (enrollment.conversation.optedOut) throw new Error("O contato pediu para não receber mensagens.");
  if (enrollment.stopReason !== "parada manualmente" && enrollment.stopReason !== "falha no envio") throw new Error("Essa cadência terminou porque o contato respondeu ou saiu; não dá para retomar.");
  await db.waEnrollment.update({ where: { id }, data: { status: "ativa", stopReason: null, attempts: 0, nextRunAt: now } });
}

/** Cancela várias inscrições de uma vez (as que estão na fila). */
export async function stopManyEnrollments(ids: string[]): Promise<number> {
  const result = await db.waEnrollment.updateMany({ where: { id: { in: ids }, status: "ativa" }, data: { status: "parada", stopReason: "parada manualmente", nextRunAt: null } });
  return result.count;
}

/* ---------- regras de entrada: para quem, e repetição ---------- */

export type AudienceCandidate = {
  /** Conversa já existente (vazio = ainda vai ser criada a partir do cadastro de clientes). */
  conversationId?: string;
  phone: string;
  name: string | null;
  customerId?: string;
  /** Inscrição antiga nesta cadência que será reiniciada (repetição). */
  restartEnrollmentId?: string;
};

type AudienceCadence = { id: string; audience: unknown; repeatAfterDays: number | null };

/** Quem entraria agora: combina o público da cadência, tira quem pediu para sair e quem já está em alguma cadência. Não grava nada. */
export async function collectAudience(cadence: AudienceCadence, now = new Date()): Promise<AudienceCandidate[]> {
  const audience = normalizeAudience(cadence.audience);
  const found = new Map<string, AudienceCandidate>();

  const c = audience.conversations;
  if (c) {
    const cutoff = c.silentDays ? new Date(now.getTime() - c.silentDays * 86_400_000) : null;
    const rows = await db.waConversation.findMany({
      where: {
        optedOut: false,
        ...(c.sources.length ? { source: { in: c.sources } } : {}),
        ...(c.stages.length ? { stage: { in: c.stages } } : {}),
        ...(c.tag ? { tags: { has: c.tag } } : {}),
        ...(cutoff ? { createdAt: { lt: cutoff }, OR: [{ lastMessageAt: null }, { lastMessageAt: { lt: cutoff } }] } : {}),
      },
      select: { id: true, phone: true, name: true },
      take: 3000,
    });
    for (const r of rows) found.set(r.phone, { conversationId: r.id, phone: r.phone, name: r.name });
  }

  if (audience.inactiveCustomersDays) {
    const customers = await getCustomersWithMetrics();
    const inactive = customers.flatMap((cu) => {
      const phone = normalizePhone(cu.phone);
      return phone && isInactive(cu.metrics, now, audience.inactiveCustomersDays) && !wasRecentlyReminded(cu.lastReminderAt, now) ? [{ phone, name: cu.name, customerId: cu.id }] : [];
    });
    if (inactive.length > 0) {
      const existing = await db.waConversation.findMany({ where: { phone: { in: inactive.map((i) => i.phone) } }, select: { id: true, phone: true, optedOut: true } });
      const byPhone = new Map(existing.map((e) => [e.phone, e]));
      for (const i of inactive) {
        const conv = byPhone.get(i.phone);
        if (conv?.optedOut) continue;
        found.set(i.phone, { ...(found.get(i.phone) ?? {}), conversationId: conv?.id, phone: i.phone, name: i.name, customerId: i.customerId });
      }
    }
  }

  const withConversation = [...found.values()].filter((f) => f.conversationId);
  const ids = withConversation.map((f) => f.conversationId!);
  const [busy, mine] = ids.length
    ? await Promise.all([
        db.waEnrollment.findMany({ where: { status: "ativa", conversationId: { in: ids } }, select: { conversationId: true } }),
        db.waEnrollment.findMany({ where: { cadenceId: cadence.id, conversationId: { in: ids } }, select: { id: true, conversationId: true, status: true, finishedAt: true } }),
      ])
    : [[], []];
  const busySet = new Set(busy.map((b) => b.conversationId));
  const mineBy = new Map(mine.map((m) => [m.conversationId, m]));

  const result: AudienceCandidate[] = [];
  for (const cand of found.values()) {
    if (!cand.conversationId) {
      result.push(cand);
      continue;
    }
    if (busySet.has(cand.conversationId)) continue;
    const previous = mineBy.get(cand.conversationId);
    if (previous) {
      if (!canRepeat(cadence.repeatAfterDays, previous, now)) continue;
      cand.restartEnrollmentId = previous.id;
    }
    result.push(cand);
  }
  return result;
}

/** Quantos entrariam agora e alguns nomes de exemplo (para o "ver quem entraria" do editor). */
export async function previewAudience(cadence: AudienceCadence, now = new Date()): Promise<{ count: number; sample: string[]; restarting: number }> {
  const list = await collectAudience(cadence, now);
  return { count: list.length, sample: list.slice(0, 6).map((c) => c.name ?? c.phone), restarting: list.filter((c) => c.restartEnrollmentId).length };
}

const MAX_AUTO_ENROLL_PER_RUN = 100;

/** Coloca na cadência quem combina com o público dela (até 100 por vez; o limite diário de envio segura o ritmo). */
export async function applyAudience(cadenceId: string, now = new Date(), limit = MAX_AUTO_ENROLL_PER_RUN): Promise<number> {
  const cadence = await db.waCadence.findUnique({ where: { id: cadenceId } });
  if (!cadence) throw new Error("Cadência não encontrada.");
  const parsed = normalizeSteps(cadence.steps);
  if (!parsed.ok) throw new Error("A cadência não tem mensagens válidas.");
  if (!hasAudience(normalizeAudience(cadence.audience))) return 0;

  const candidates = (await collectAudience(cadence, now)).slice(0, limit);
  const nextRunAt = new Date(now.getTime() + parsed.steps[0].delayHours * 3_600_000);
  let enrolled = 0;
  for (const cand of candidates) {
    let conversationId = cand.conversationId;
    if (!conversationId) {
      const created = await db.waConversation.upsert({ where: { phone: cand.phone }, create: { phone: cand.phone, name: cand.name, source: "cliente" }, update: {} });
      if (created.optedOut) continue;
      conversationId = created.id;
    }
    if (cand.restartEnrollmentId) {
      await db.waEnrollment.update({
        where: { id: cand.restartEnrollmentId },
        data: { status: "ativa", stepIndex: 0, attempts: 0, stopReason: null, finishedAt: null, nextRunAt, createdAt: now, rounds: { increment: 1 } },
      });
    } else {
      await db.waEnrollment.createMany({ data: [{ cadenceId, conversationId, stepIndex: 0, nextRunAt, status: "ativa" }], skipDuplicates: true });
    }
    if (cand.customerId) await markCustomerReminded(cand.customerId).catch(() => null);
    enrolled += 1;
  }
  return enrolled;
}

/** Entrada automática de todas as cadências ativas que têm regra de público. */
export async function runAutoEnroll(now = new Date()): Promise<number> {
  const cadences = await db.waCadence.findMany({ where: { active: true, autoEnroll: true } });
  let total = 0;
  for (const cadence of cadences) {
    try {
      total += await applyAudience(cadence.id, now);
    } catch (error) {
      console.error("[whatsapp] erro na entrada automática da cadência", cadence.id, error);
    }
  }
  return total;
}
