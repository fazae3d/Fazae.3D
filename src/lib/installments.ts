import { round2 } from "@/lib/money";
import type { Expense } from "@/server/types";

/**
 * Uma parcela de uma compra: o dia do vencimento (AAAA-MM-DD) e quanto vale.
 * `paidOn` aparece quando ela foi marcada como paga antes do vencimento (o dia em que o dinheiro saiu).
 */
export type Installment = { number: number; of: number; day: string; amount: number; paidOn?: string };

type InstallmentExpense = Pick<Expense, "totalValue" | "purchaseDate" | "installments" | "firstDueDate" | "paidInstallments">;

/** Soma meses a um dia AAAA-MM-DD; se o dia não existe no mês de destino (31 em fevereiro), cai no último dia dele. */
export function addMonthsToDay(day: string, months: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const index = y * 12 + (m - 1) + months;
  const year = Math.floor(index / 12);
  const month = index % 12;
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(Math.min(d, lastDay)).padStart(2, "0")}`;
}

/** Quantas parcelas a compra tem (compra à vista = 1). */
export function installmentCount(expense: Pick<Expense, "installments">) {
  return Math.max(1, Math.floor(expense.installments ?? 1));
}

/**
 * Cronograma da compra: à vista é uma parcela só, no dia da compra. Parcelada divide o total em partes iguais, uma por mês a partir
 * do vencimento da 1ª parcela (se não informado, o dia da compra). Os centavos que sobram da divisão ficam na última parcela.
 */
export function expenseInstallments(expense: InstallmentExpense): Installment[] {
  const of = installmentCount(expense);
  const purchaseDay = expense.purchaseDate.slice(0, 10);
  if (of === 1) return [{ number: 1, of, day: purchaseDay, amount: round2(expense.totalValue) }];
  const first = (expense.firstDueDate ?? expense.purchaseDate).slice(0, 10);
  const each = Math.floor((expense.totalValue / of) * 100) / 100;
  return Array.from({ length: of }, (_, i) => ({
    number: i + 1,
    of,
    day: addMonthsToDay(first, i),
    amount: i === of - 1 ? round2(expense.totalValue - each * (of - 1)) : each,
    paidOn: expense.paidInstallments?.[String(i + 1)],
  }));
}

/**
 * Compra à vista conta no dia da compra, como sempre. Parcela de compra parcelada conta como paga quando foi marcada como paga
 * (antecipada) ou quando o vencimento chega.
 */
export function isInstallmentPaid(installment: Installment, today: string) {
  return installment.of === 1 || Boolean(installment.paidOn) || installment.day <= today;
}

/** Dia em que o dinheiro sai: o dia em que foi marcada como paga, ou o vencimento. */
export function installmentCashDay(installment: Installment) {
  return installment.paidOn ?? installment.day;
}

/** Saídas de dinheiro de verdade (dia e valor): à vista na data da compra, parceladas em cada parcela paga ou vencida. */
export function expenseCashOutflows(expenses: InstallmentExpense[], today: string): { day: string; amount: number }[] {
  return expenses.flatMap((e) =>
    expenseInstallments(e)
      .filter((i) => isInstallmentPaid(i, today))
      .map((i) => ({ day: installmentCashDay(i), amount: i.amount })),
  );
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

export type UpcomingInstallment = { expenseId: string; description: string; number: number; of: number; day: string; amount: number };

/** Parcelas que ainda vão vencer e não foram pagas (compras parceladas), da mais próxima para a mais distante. */
export function upcomingInstallments(expenses: (InstallmentExpense & { id: string; description: string })[], today: string): UpcomingInstallment[] {
  return expenses
    .filter((e) => installmentCount(e) > 1)
    .flatMap((e) =>
      expenseInstallments(e)
        .filter((i) => !isInstallmentPaid(i, today))
        .map((i) => ({ expenseId: e.id, description: e.description, number: i.number, of: i.of, day: i.day, amount: i.amount })),
    )
    .sort((a, b) => a.day.localeCompare(b.day) || a.number - b.number);
}
