/** Números de resultado do WhatsApp (funil, origem, cadências e tempo de resposta). Puro: recebe os dados e devolve as contas. */

export type ResultConversation = { id: string; stage: string; source: string; lastInboundAt: Date | null; optedOut: boolean };
export type ResultMessage = {
  conversationId: string;
  direction: "in" | "out";
  origin: string;
  status: string;
  cadenceId: string | null;
  stepIndex: number | null;
  createdAt: Date;
};

export type StepResult = { stepIndex: number; sent: number; delivered: number; read: number; replied: number };
export type CadenceResult = { cadenceId: string; sent: number; delivered: number; read: number; replied: number; steps: StepResult[] };
export type SourceResult = { key: string; total: number; replied: number; won: number };

export type WaResults = {
  total: number;
  replied: number;
  won: number;
  lost: number;
  optedOut: number;
  byStage: { key: string; count: number }[];
  bySource: SourceResult[];
  byCadence: CadenceResult[];
  response: { count: number; medianMinutes: number | null; averageMinutes: number | null };
};

/** Quanto tempo depois de uma mensagem automática uma resposta ainda conta como "respondeu a ela". */
export const REPLY_WINDOW_MS = 72 * 3_600_000;

const DELIVERED = new Set(["delivered", "read"]);

function median(values: number[]) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function analyzeResults(conversations: ResultConversation[], messages: ResultMessage[], stageKeys: string[]): WaResults {
  const byStageMap = new Map(stageKeys.map((k) => [k, 0]));
  const sources = new Map<string, SourceResult>();
  let replied = 0;
  let won = 0;
  let lost = 0;
  let optedOut = 0;
  for (const c of conversations) {
    byStageMap.set(c.stage, (byStageMap.get(c.stage) ?? 0) + 1);
    const s = sources.get(c.source) ?? { key: c.source, total: 0, replied: 0, won: 0 };
    s.total += 1;
    if (c.lastInboundAt) {
      s.replied += 1;
      replied += 1;
    }
    if (c.stage === "ganho") {
      s.won += 1;
      won += 1;
    }
    if (c.stage === "perdido") lost += 1;
    if (c.optedOut) optedOut += 1;
    sources.set(c.source, s);
  }

  const sorted = [...messages].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  const inboundBy = new Map<string, number[]>();
  for (const m of sorted) {
    if (m.direction !== "in") continue;
    const list = inboundBy.get(m.conversationId) ?? [];
    list.push(m.createdAt.getTime());
    inboundBy.set(m.conversationId, list);
  }

  // Resultado por cadência e por mensagem (passo): enviada, entregue, lida e respondida em até 72 h.
  const cadences = new Map<string, CadenceResult>();
  for (const m of sorted) {
    if (m.direction !== "out" || m.origin !== "cadencia" || !m.cadenceId || m.status === "failed") continue;
    const cadence = cadences.get(m.cadenceId) ?? { cadenceId: m.cadenceId, sent: 0, delivered: 0, read: 0, replied: 0, steps: [] };
    const stepIndex = m.stepIndex ?? 0;
    let step = cadence.steps.find((s) => s.stepIndex === stepIndex);
    if (!step) {
      step = { stepIndex, sent: 0, delivered: 0, read: 0, replied: 0 };
      cadence.steps.push(step);
    }
    const at = m.createdAt.getTime();
    const didReply = (inboundBy.get(m.conversationId) ?? []).some((t) => t > at && t <= at + REPLY_WINDOW_MS);
    for (const target of [cadence, step]) {
      target.sent += 1;
      if (DELIVERED.has(m.status)) target.delivered += 1;
      if (m.status === "read") target.read += 1;
      if (didReply) target.replied += 1;
    }
    cadences.set(m.cadenceId, cadence);
  }
  for (const c of cadences.values()) c.steps.sort((a, b) => a.stepIndex - b.stepIndex);

  // Tempo da primeira resposta: do cliente escrever até alguém da loja (você, ou o celular) responder.
  const waits: number[] = [];
  const pending = new Map<string, number>();
  for (const m of sorted) {
    if (m.direction === "in") {
      if (!pending.has(m.conversationId)) pending.set(m.conversationId, m.createdAt.getTime());
    } else if ((m.origin === "manual" || m.origin === "celular") && pending.has(m.conversationId)) {
      waits.push((m.createdAt.getTime() - pending.get(m.conversationId)!) / 60_000);
      pending.delete(m.conversationId);
    }
  }

  return {
    total: conversations.length,
    replied,
    won,
    lost,
    optedOut,
    byStage: stageKeys.map((key) => ({ key, count: byStageMap.get(key) ?? 0 })),
    bySource: [...sources.values()].sort((a, b) => b.total - a.total),
    byCadence: [...cadences.values()].sort((a, b) => b.sent - a.sent),
    response: {
      count: waits.length,
      medianMinutes: median(waits),
      averageMinutes: waits.length ? waits.reduce((s, v) => s + v, 0) / waits.length : null,
    },
  };
}

/** "12 min", "3,5 h", "2 dias". */
export function formatDuration(minutes: number | null) {
  if (minutes === null) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${hours.toFixed(1).replace(".", ",").replace(",0", "")} h`;
  const days = hours / 24;
  return `${days.toFixed(1).replace(".", ",").replace(",0", "")} dias`;
}

export const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
