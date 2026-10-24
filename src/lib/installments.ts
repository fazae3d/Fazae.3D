import { round2 } from "@/lib/money";
import type { Expense } from "@/server/types";

/**
 * Uma parcela de uma compra: o dia do vencimento (AAAA-MM-DD) e quanto vale.
 * `paidOn` aparece quando ela foi marcada como paga antes do vencimento (o dia em que o dinheiro saiu).
 * `immediate` é a compra à vista sem vencimento informado (Pix, dinheiro, débito): sai do caixa no dia da compra.
 */
export type Installment = { number: number; of: number; day: string; amount: number; paidOn?: string; immediate: boolean; adjusted: boolean };

type InstallmentExpense = Pick<Expense, "totalValue" | "purchaseDate" | "installments" | "firstDueDate" | "paidInstallments" | "installmentAmounts">;

export const PAYMENT_METHODS = [
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "debito", label: "Débito" },
  { value: "cartao", label: "Cartão de crédito" },
] as const;

export function paymentMethodLabel(method?: string) {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label;
}

/** Soma meses a um dia AAAA-MM-DD; se o dia não existe no mês de destino (31 em fevereiro), cai no último dia dele. */
export function addMonthsToDay(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = index % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/** Soma dias a um dia AAAA-MM-DD. */
export function addDaysToDay(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Meses AAAA-MM de `from` até `to`, inclusive (no máximo 120). */
export function monthsBetween(from: string, to: string): string[] {
  const out: string[] = [];
  let cursor = `${from}-01`;
  while (cursor.slice(0, 7) <= to && out.length < 120) {
    out.push(cursor.slice(0, 7));
    cursor = addMonthsToDay(cursor, 1);
  }
  return out;
}

/** Dia do lançamento de uma despesa recorrente no mês: o dia escolhido, ou o último dia do mês se ele não existir (31 em abril). */
export function occurrenceDay(month: string, dayOfMonth: number): string {
  const lastDay = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
  return `${month}-${String(Math.min(dayOfMonth, lastDay)).padStart(2, "0")}`;
}

/** Quantas parcelas a compra tem (compra à vista = 1). */
export function installmentCount(expense: Pick<Expense, "installments">) {
  return Math.max(1, Math.floor(expense.installments ?? 1));
}

/** Tem cronograma próprio (parcelada, ou à vista no cartão com vencimento da fatura)? Senão é um gasto simples, na data da compra. */
export function hasSchedule(expense: Pick<Expense, "installments" | "firstDueDate">) {
  return installmentCount(expense) > 1 || Boolean(expense.firstDueDate);
}

/**
 * Cronograma da compra. Sem parcelas nem vencimento é uma parcela só, no dia da compra. Parcelada divide o total em partes iguais,
 * uma por mês a partir do vencimento da 1ª parcela (se não informado, o dia da compra); os centavos que sobram da divisão ficam na
 * última. Parcela com valor ajustado (juros) usa o valor ajustado.
 */
export function expenseInstallments(expense: InstallmentExpense): Installment[] {
  const of = installmentCount(expense);
  const purchaseDay = expense.purchaseDate.slice(0, 10);
  const override = (n: number, amount: number) => {
    const adjusted = expense.installmentAmounts?.[String(n)];
    return adjusted !== undefined ? { amount: round2(adjusted), adjusted: true } : { amount, adjusted: false };
  };
  if (of === 1) {
    const due = expense.firstDueDate?.slice(0, 10);
    return [{ number: 1, of, day: due ?? purchaseDay, ...override(1, round2(expense.totalValue)), paidOn: expense.paidInstallments?.["1"], immediate: !due }];
  }
  const first = (expense.firstDueDate ?? expense.purchaseDate).slice(0, 10);
  const each = Math.floor((expense.totalValue / of) * 100) / 100;
  return Array.from({ length: of }, (_, i) => ({
    number: i + 1,
    of,
    day: addMonthsToDay(first, i),
    ...override(i + 1, i === of - 1 ? round2(expense.totalValue - each * (of - 1)) : each),
    paidOn: expense.paidInstallments?.[String(i + 1)],
    immediate: false,
  }));
}

/**
 * Gasto simples conta no dia da compra, como sempre. Parcela (ou fatura com vencimento) conta como paga quando foi marcada como paga
 * (antecipada) ou quando o vencimento chega.
 */
export function isInstallmentPaid(installment: Installment, today: string) {
  return installment.immediate || Boolean(installment.paidOn) || installment.day <= today;
}

/** Dia em que o dinheiro sai: o dia em que foi marcada como paga, ou o vencimento. */
export function installmentCashDay(installment: Installment) {
  return installment.paidOn ?? installment.day;
}

/** Saídas de dinheiro de verdade (dia e valor): gasto simples na data da compra, parcelas e faturas pagas ou vencidas. */
export function expenseCashOutflows(expenses: InstallmentExpense[], today: string): { day: string; amount: number }[] {
  return expenses.flatMap((e) =>
    expenseInstallments(e)
      .filter((i) => isInstallmentPaid(i, today))
      .map((i) => ({ day: installmentCashDay(i), amount: i.amount })),
  );
}

/** Soma real das parcelas (com ajustes) menos o valor da compra: o que foi pago a mais, em juros. Negativo ou zero = sem juros. */
export function installmentInterest(expense: InstallmentExpense) {
  const total = expenseInstallments(expense).reduce((sum, i) => sum + i.amount, 0);
  return round2(total - expense.totalValue);
}

export type InstallmentSummary = {
  of: number;
  paid: number;
  paidAmount: number;
  remaining: number;
  remainingAmount: number;
  nextDay: string | null;
  nextAmount: number | null;
};

export function installmentSummary(expense: InstallmentExpense, today: string): InstallmentSummary {
  const all = expenseInstallments(expense);
  const paid = all.filter((i) => isInstallmentPaid(i, today));
  const pending = all.filter((i) => !isInstallmentPaid(i, today));
  return {
    of: all.length,
    paid: paid.length,
    paidAmount: round2(paid.reduce((sum, i) => sum + i.amount, 0)),
    remaining: pending.length,
    remainingAmount: round2(pending.reduce((sum, i) => sum + i.amount, 0)),
    nextDay: pending[0]?.day ?? null,
    nextAmount: pending[0]?.amount ?? null,
  };
}

export type UpcomingInstallment = {
  expenseId: string;
  description: string;
  number: number;
  of: number;
  day: string;
  amount: number;
  cardName?: string;
};

type UpcomingSource = InstallmentExpense & { id: string; description: string; cardName?: string };

/** Parcelas e faturas que ainda vão vencer e não foram pagas, da mais próxima para a mais distante. */
export function upcomingInstallments(expenses: UpcomingSource[], today: string): UpcomingInstallment[] {
  return expenses
    .filter(hasSchedule)
    .flatMap((e) =>
      expenseInstallments(e)
        .filter((i) => !isInstallmentPaid(i, today))
        .map((i) => ({ expenseId: e.id, description: e.description, number: i.number, of: i.of, day: i.day, amount: i.amount, cardName: e.cardName })),
    )
    .sort((a, b) => a.day.localeCompare(b.day) || a.number - b.number);
}

/** Quanto vence nos próximos `days` dias (a partir de hoje) em parcelas e faturas ainda não pagas. */
export function committedWithin(expenses: UpcomingSource[], today: string, days: number) {
  const limit = addDaysToDay(today, days);
  return round2(upcomingInstallments(expenses, today).filter((i) => i.day <= limit).reduce((sum, i) => sum + i.amount, 0));
}

export type MonthlyBill = { month: string; total: number; byCard: { card: string; total: number }[] };

/** O que ainda vai vencer em cada mês, separado por cartão (sem nome de cartão, tudo vai em "Cartão"). */
export function billsByMonth(upcoming: UpcomingInstallment[]): MonthlyBill[] {
  const months = new Map<string, Map<string, number>>();
  for (const i of upcoming) {
    const key = i.day.slice(0, 7);
    const cards = months.get(key) ?? new Map<string, number>();
    const card = i.cardName?.trim() || "Cartão";
    cards.set(card, round2((cards.get(card) ?? 0) + i.amount));
    months.set(key, cards);
  }
  return [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, cards]) => ({
      month,
      total: round2([...cards.values()].reduce((sum, v) => sum + v, 0)),
      byCard: [...cards.entries()].map(([card, total]) => ({ card, total })).sort((a, b) => b.total - a.total),
    }));
}
