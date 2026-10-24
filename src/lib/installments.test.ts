import { describe, expect, it } from "vitest";
import { cashPosition } from "./cash";
import { cashFlowByMonth } from "./finance-stats";
import { addMonthsToDay, expenseInstallments, installmentSummary, upcomingInstallments } from "./installments";

const expense = (over: Record<string, unknown>) =>
  ({ id: "e1", description: "Impressora", category: "equipamento", totalValue: 1000, purchaseDate: "2026-09-10T00:00:00.000Z", createdAt: "2026-09-10T12:00:00.000Z", ...over }) as never;

describe("compra parcelada", () => {
  it("compra à vista é uma parcela só, no dia da compra", () => {
    expect(expenseInstallments(expense({}))).toEqual([{ number: 1, of: 1, day: "2026-09-10", amount: 1000 }]);
  });

  it("divide em partes iguais, uma por mês, e a última fica com os centavos", () => {
    const list = expenseInstallments(expense({ totalValue: 100, installments: 3 }));
    expect(list.map((i) => i.day)).toEqual(["2026-09-10", "2026-10-10", "2026-11-10"]);
    expect(list.map((i) => i.amount)).toEqual([33.33, 33.33, 33.34]);
    expect(list.reduce((s, i) => s + i.amount, 0)).toBeCloseTo(100, 2);
  });

  it("usa o vencimento da 1ª parcela quando informado", () => {
    const list = expenseInstallments(expense({ installments: 2, firstDueDate: "2026-10-05T00:00:00.000Z" }));
    expect(list.map((i) => i.day)).toEqual(["2026-10-05", "2026-11-05"]);
  });

  it("dia 31 cai no último dia de meses mais curtos e vira o ano", () => {
    expect(addMonthsToDay("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonthsToDay("2026-11-15", 3)).toBe("2027-02-15");
    expect(addMonthsToDay("2026-12-31", 2)).toBe("2027-02-28");
  });

  it("resumo: quantas já venceram e quanto falta", () => {
    const e = expense({ totalValue: 1200, installments: 12 });
    const s = installmentSummary(e, "2026-12-10");
    expect(s.paid).toBe(4);
    expect(s.paidAmount).toBe(400);
    expect(s.remaining).toBe(8);
    expect(s.remainingAmount).toBe(800);
    expect(s.nextDay).toBe("2027-01-10");
  });

  it("lista as parcelas futuras em ordem; à vista não entra", () => {
    const a = expense({ id: "a", description: "Máquina", totalValue: 300, installments: 3 });
    const b = expense({ id: "b", description: "Filamento", totalValue: 80 });
    const up = upcomingInstallments([a, b], "2026-09-20");
    expect(up.map((i) => `${i.description} ${i.number}/${i.of}`)).toEqual(["Máquina 2/3", "Máquina 3/3"]);
  });
});

describe("compra parcelada no caixa", () => {
  const base = { openingBalance: 5000, openingDate: "2026-09-01", payments: [], orders: [] };

  it("Em caixa só desconta as parcelas já vencidas", () => {
    const e = expense({ totalValue: 1000, installments: 4 });
    expect(cashPosition({ ...base, expenses: [e], today: "2026-09-10" }).spent).toBe(250);
    expect(cashPosition({ ...base, expenses: [e], today: "2026-11-20" }).spent).toBe(750);
    expect(cashPosition({ ...base, expenses: [e], today: "2027-06-01" }).spent).toBe(1000);
  });

  it("compra à vista segue contando inteira na data da compra", () => {
    const e = expense({ totalValue: 1000 });
    expect(cashPosition({ ...base, expenses: [e], today: "2026-09-10" }).spent).toBe(1000);
  });

  it("fluxo de caixa mostra cada parcela no mês do vencimento (só as já vencidas)", () => {
    // Compra parcelada começando no mês atual: a parcela de hoje conta, as dos meses seguintes ainda não.
    const now = new Date();
    const thisMonth = now.toISOString().slice(0, 7);
    const purchase = `${thisMonth}-01T00:00:00.000Z`;
    const e = expense({ totalValue: 900, installments: 3, purchaseDate: purchase });
    const flow = cashFlowByMonth([], [e], 2, `${thisMonth}-28`);
    expect(flow[flow.length - 1].outflow).toBe(300);
    const later = cashFlowByMonth([], [e], 2, `${thisMonth}-28`);
    expect(later.reduce((sum, m) => sum + m.outflow, 0)).toBe(300);
  });
});

describe("parcela paga antes do vencimento", () => {
  const base = { openingBalance: 5000, openingDate: "2026-09-01", payments: [], orders: [] };
  const e = expense({ totalValue: 400, installments: 4, paidInstallments: { "3": "2026-09-15" } });

  it("conta como paga e sai do caixa no dia marcado, não no vencimento", () => {
    const list = expenseInstallments(e);
    expect(list[2].paidOn).toBe("2026-09-15");
    expect(installmentSummary(e, "2026-09-20").paid).toBe(2);
    // 1ª venceu em 09-10 (100) e a 3ª foi paga em 09-15 (100): 200 já saíram
    expect(cashPosition({ ...base, expenses: [e], today: "2026-09-20" }).spent).toBe(200);
  });

  it("não aparece mais em parcelas a pagar", () => {
    const up = upcomingInstallments([{ ...e, id: "e1", description: "Máquina" }] as never, "2026-09-20");
    expect(up.map((i) => i.number)).toEqual([2, 4]);
  });

  it("no vencimento não conta de novo", () => {
    expect(cashPosition({ ...base, expenses: [e], today: "2026-12-31" }).spent).toBe(400);
  });
});
