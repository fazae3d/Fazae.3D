import { describe, expect, it } from "vitest";
import { customerSourceLabel, sourceBreakdown } from "./customer-source";
import { buildQuoteFunnel, funnelPeriod } from "./quote-funnel";

const NOW = new Date("2026-10-25T15:00:00.000Z");
const day = (d: string) => `${d}T15:00:00.000Z`;

const quote = (over: Record<string, unknown>) =>
  ({
    id: String(over.number ?? "1"),
    number: 1,
    status: "enviado",
    total: 100,
    validUntil: day("2026-11-30"),
    createdAt: day("2026-10-20"),
    customerName: "Cliente",
    ...over,
  }) as never;

describe("funil de orçamentos", () => {
  const quotes = [
    quote({ number: 1, status: "rascunho", total: 50 }),
    quote({ number: 2, status: "enviado", total: 200, sentAt: day("2026-10-21") }), // em aberto
    quote({ number: 3, status: "aprovado", total: 300, sentAt: day("2026-10-20"), decidedAt: day("2026-10-22") }),
    quote({ number: 4, status: "aprovado", total: 100, sentAt: day("2026-10-20"), decidedAt: day("2026-10-21") }),
    quote({ number: 5, status: "recusado", total: 400, lostReason: "preco" }),
    quote({ number: 6, status: "recusado", total: 100, lostReason: "preco" }),
    quote({ number: 7, status: "recusado", total: 80, lostReason: "prazo" }),
    quote({ number: 8, status: "recusado", total: 20 }), // sem motivo (antigo)
    quote({ number: 9, status: "enviado", total: 60, validUntil: day("2026-10-10") }), // venceu
  ];
  const f = buildQuoteFunnel(quotes, NOW);

  it("conta cada etapa", () => {
    expect(f.created.count).toBe(9);
    expect(f.drafts.count).toBe(1);
    expect(f.sent.count).toBe(8);
    expect(f.approved).toEqual({ count: 2, value: 400 });
    expect(f.refused.count).toBe(4);
    expect(f.expired).toEqual({ count: 1, value: 60 });
    expect(f.open).toEqual({ count: 1, value: 200 });
  });

  it("taxa de fechamento só olha o que já teve desfecho", () => {
    // 2 aprovados de 2 + 4 recusados + 1 vencido = 7 com desfecho
    expect(f.closeRatePct).toBe(29);
    expect(f.sentToApprovedPct).toBe(25);
    expect(f.averageApprovedTicket).toBe(200);
    expect(f.averageDaysToApprove).toBe(1.5);
  });

  it("perdas por motivo, do mais comum ao menos (empate: o de maior valor), com o vencido separado", () => {
    expect(f.losses.map((l) => [l.key, l.count, l.value])).toEqual([
      ["preco", 2, 500],
      ["prazo", 1, 80],
      ["venceu", 1, 60],
      ["nao_informado", 1, 20],
    ]);
    expect(f.losses[0].pct).toBe(40);
    expect(f.lostValue).toBe(660);
  });

  it("sem orçamentos ou sem desfecho não inventa taxa", () => {
    const empty = buildQuoteFunnel([], NOW);
    expect(empty.closeRatePct).toBeNull();
    expect(empty.averageApprovedTicket).toBeNull();
    expect(empty.losses).toEqual([]);
    expect(buildQuoteFunnel([quote({ status: "enviado" })], NOW).closeRatePct).toBeNull();
  });

  it("período aceita 30, 90 ou todos; o resto vira 90", () => {
    expect(funnelPeriod("30")).toEqual({ key: "30", days: 30 });
    expect(funnelPeriod("todos")).toEqual({ key: "todos", days: null });
    expect(funnelPeriod("abc")).toEqual({ key: "90", days: 90 });
    expect(funnelPeriod(undefined).days).toBe(90);
  });
});

describe("origem dos clientes", () => {
  it("rótulos e contagem, com 'Não informado' para quem não tem", () => {
    expect(customerSourceLabel("instagram")).toBe("Instagram");
    expect(customerSourceLabel(undefined)).toBe("Não informado");
    expect(customerSourceLabel("qualquer")).toBe("Não informado");
    const rows = sourceBreakdown([{ source: "instagram" }, { source: "instagram" }, { source: "indicacao" }, {}, { source: "lixo" }]);
    expect(rows.map((r) => [r.label, r.count])).toEqual([
      ["Instagram", 2],
      ["Não informado", 2],
      ["Indicação de amigo ou cliente", 1],
    ]);
  });
});
