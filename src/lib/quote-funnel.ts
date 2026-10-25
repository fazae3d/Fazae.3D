import { round2 } from "@/lib/money";
import { isQuoteExpired, needsFollowUp, quoteLossLabel, type Quote } from "@/lib/quote";

type FunnelQuote = Pick<Quote, "id" | "number" | "status" | "total" | "validUntil" | "sentAt" | "decidedAt" | "lastFollowUpAt" | "lostReason" | "createdAt" | "customerName" | "title">;

export type FunnelStage = { count: number; value: number };

export type LossRow = { key: string; label: string; count: number; value: number; pct: number };

export type QuoteFunnel = {
  /** Todos os orçamentos do período, rascunhos inclusive. */
  created: FunnelStage;
  /** Já saíram do rascunho (foram enviados ao cliente). */
  sent: FunnelStage;
  approved: FunnelStage;
  /** Cliente recusou ou o orçamento foi dado como perdido. */
  refused: FunnelStage;
  /** Enviados que passaram da validade sem resposta. */
  expired: FunnelStage;
  /** Enviados, dentro da validade, esperando resposta. */
  open: FunnelStage;
  drafts: FunnelStage;
  /** Aprovados ÷ (aprovados + recusados + vencidos): dos que já tiveram desfecho, quantos fecharam. null = ainda sem desfecho. */
  closeRatePct: number | null;
  /** Dos enviados, quantos o cliente aprovou (inclui os ainda em aberto). */
  sentToApprovedPct: number | null;
  averageApprovedTicket: number | null;
  /** Dias médios entre o envio e a aprovação. */
  averageDaysToApprove: number | null;
  losses: LossRow[];
  lostValue: number;
  /** Enviados em aberto que merecem um novo contato agora. */
  followUps: FunnelQuote[];
};

function stage(quotes: FunnelQuote[]): FunnelStage {
  return { count: quotes.length, value: round2(quotes.reduce((sum, q) => sum + q.total, 0)) };
}

const DAY_MS = 86_400_000;

/** Funil dos orçamentos de um conjunto (já filtrado pelo período). */
export function buildQuoteFunnel(quotes: FunnelQuote[], now = new Date()): QuoteFunnel {
  const drafts = quotes.filter((q) => q.status === "rascunho");
  const sent = quotes.filter((q) => q.status !== "rascunho");
  const approved = quotes.filter((q) => q.status === "aprovado");
  const refused = quotes.filter((q) => q.status === "recusado");
  const expired = quotes.filter((q) => q.status === "enviado" && isQuoteExpired(q, now));
  const open = quotes.filter((q) => q.status === "enviado" && !isQuoteExpired(q, now));

  const decided = approved.length + refused.length + expired.length;
  const days = approved
    .filter((q) => q.sentAt && q.decidedAt)
    .map((q) => (new Date(q.decidedAt!).getTime() - new Date(q.sentAt!).getTime()) / DAY_MS)
    .filter((d) => d >= 0);

  const lossMap = new Map<string, { label: string; count: number; value: number }>();
  const addLoss = (key: string, label: string, q: FunnelQuote) => {
    const row = lossMap.get(key) ?? { label, count: 0, value: 0 };
    row.count += 1;
    row.value += q.total;
    lossMap.set(key, row);
  };
  for (const q of refused) addLoss(q.lostReason ?? "nao_informado", quoteLossLabel(q.lostReason), q);
  for (const q of expired) addLoss("venceu", "Venceu sem resposta", q);
  const lost = [...refused, ...expired];
  const lostValue = round2(lost.reduce((sum, q) => sum + q.total, 0));

  return {
    created: stage(quotes),
    sent: stage(sent),
    approved: stage(approved),
    refused: stage(refused),
    expired: stage(expired),
    open: stage(open),
    drafts: stage(drafts),
    closeRatePct: decided > 0 ? Math.round((approved.length / decided) * 100) : null,
    sentToApprovedPct: sent.length > 0 ? Math.round((approved.length / sent.length) * 100) : null,
    averageApprovedTicket: approved.length > 0 ? round2(approved.reduce((sum, q) => sum + q.total, 0) / approved.length) : null,
    averageDaysToApprove: days.length > 0 ? Math.round((days.reduce((sum, d) => sum + d, 0) / days.length) * 10) / 10 : null,
    losses: [...lossMap.entries()]
      .map(([key, row]) => ({
        key,
        label: row.label,
        count: row.count,
        value: round2(row.value),
        pct: lost.length > 0 ? Math.round((row.count / lost.length) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count || b.value - a.value),
    lostValue,
    followUps: open.filter((q) => needsFollowUp(q as Pick<Quote, "status" | "validUntil" | "sentAt" | "lastFollowUpAt">, now)),
  };
}

/** Período do filtro do funil: "30", "90" ou "todos" (qualquer outro valor vira "90"). */
export function funnelPeriod(value?: string) {
  const key = value === "30" || value === "todos" ? value : "90";
  return { key, days: key === "todos" ? null : Number(key) };
}
