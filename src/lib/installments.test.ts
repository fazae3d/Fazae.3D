import { describe, expect, it } from "vitest";
import { cashPosition } from "./cash";
import { cashFlowByMonth } from "./finance-stats";
import {
  addMonthsToDay,
  billsByMonth,
  committedWithin,
  expenseInstallments,
  hasSchedule,
  installmentInterest,
  installmentSummary,
  monthsBetween,
  occurrenceDay,
  upcomingInstallments,
} from "./installments";

const expense = (over: Record<string, unknown>) =>
  ({ id: "e1", description: "Impressora", category: "equipamento", totalValue: 1000, purchaseDate: "2026-09-10T00:00:00.000Z", createdAt: "2026-09-10T12:00:00.000Z", ...over }) as never;

describe("compra parcelada", () => {
  it("compra à vista é uma parcela só, no dia da compra", () => {
    expect(expenseInstallments(expense({}))).toMatchObject([{ number: 1, of: 1, day: "2026-09-10", amount: 1000, immediate: true }]);
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
    const up = upcomingInstallments([e], "2026-09-20");
    expect(up.map((i) => i.number)).toEqual([2, 4]);
  });

  it("no vencimento não conta de novo", () => {
    expect(cashPosition({ ...base, expenses: [e], today: "2026-12-31" }).spent).toBe(400);
  });
});

describe("cartão à vista com vencimento da fatura", () => {
  const base = { openingBalance: 5000, openingDate: "2026-09-01", payments: [], orders: [] };
  const e = expense({ totalValue: 80, firstDueDate: "2026-10-10T00:00:00.000Z", paymentMethod: "cartao" });

  it("só sai do caixa no vencimento da fatura", () => {
    expect(hasSchedule(e)).toBe(true);
    expect(cashPosition({ ...base, expenses: [e], today: "2026-09-20" }).spent).toBe(0);
    expect(cashPosition({ ...base, expenses: [e], today: "2026-10-10" }).spent).toBe(80);
  });

  it("aparece como a pagar até lá e pode ser marcada como paga antes", () => {
    expect(upcomingInstallments([e], "2026-09-20").map((i) => i.amount)).toEqual([80]);
    const paidEarly = expense({ totalValue: 80, firstDueDate: "2026-10-10T00:00:00.000Z", paidInstallments: { "1": "2026-09-18" } });
    expect(cashPosition({ ...base, expenses: [paidEarly], today: "2026-09-20" }).spent).toBe(80);
  });

  it("sem vencimento continua contando no dia da compra", () => {
    expect(hasSchedule(expense({}))).toBe(false);
    expect(cashPosition({ ...base, expenses: [expense({ totalValue: 80 })], today: "2026-09-10" }).spent).toBe(80);
  });
});

describe("parcela ajustada (juros)", () => {
  const base = { openingBalance: 5000, openingDate: "2026-09-01", payments: [], orders: [] };
  const e = expense({ totalValue: 300, installments: 3, installmentAmounts: { "2": 110, "3": 110 } });

  it("usa o valor ajustado e calcula os juros", () => {
    const list = expenseInstallments(e);
    expect(list.map((i) => i.amount)).toEqual([100, 110, 110]);
    expect(list.map((i) => i.adjusted)).toEqual([false, true, true]);
    expect(installmentInterest(e)).toBe(20);
    expect(installmentInterest(expense({ totalValue: 300, installments: 3 }))).toBe(0);
  });

  it("o caixa e o que falta pagar seguem o valor ajustado", () => {
    expect(cashPosition({ ...base, expenses: [e], today: "2026-10-20" }).spent).toBe(210);
    expect(installmentSummary(e, "2026-10-20").remainingAmount).toBe(110);
  });
});

describe("compromissos e faturas", () => {
  const nubank = expense({ id: "n", description: "Impressora", totalValue: 300, installments: 3, cardName: "Nubank", firstDueDate: "2026-10-05T00:00:00.000Z" });
  const inter = expense({ id: "i", description: "Filamento", totalValue: 100, installments: 2, cardName: "Inter", firstDueDate: "2026-10-20T00:00:00.000Z" });

  it("soma o que vence nos próximos dias", () => {
    // hoje 10-01: em 30 dias vencem 10-05 (100) e 10-20 (50); em 60 dias entram também 11-05 e 11-20
    expect(committedWithin([nubank, inter], "2026-10-01", 30)).toBe(150);
    expect(committedWithin([nubank, inter], "2026-10-01", 60)).toBe(300);
  });

  it("agrupa por mês e por cartão", () => {
    const bills = billsByMonth(upcomingInstallments([nubank, inter], "2026-10-01"));
    expect(bills.map((b) => b.month)).toEqual(["2026-10", "2026-11", "2026-12"]);
    expect(bills[0].total).toBe(150);
    expect(bills[0].byCard).toEqual([
      { card: "Nubank", total: 100 },
      { card: "Inter", total: 50 },
    ]);
  });
});

describe("despesa recorrente", () => {
  it("lista os meses e usa o último dia quando o dia escolhido não existe", () => {
    expect(monthsBetween("2026-11", "2027-02")).toEqual(["2026-11", "2026-12", "2027-01", "2027-02"]);
    expect(occurrenceDay("2026-04", 31)).toBe("2026-04-30");
    expect(occurrenceDay("2028-02", 30)).toBe("2028-02-29");
    expect(occurrenceDay("2026-10", 5)).toBe("2026-10-05");
  });
});
