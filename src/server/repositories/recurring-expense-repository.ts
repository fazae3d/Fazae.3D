import { db } from "../db";
import type { ExpenseCategory } from "../types";
import { addMonthsToDay, monthsBetween, occurrenceDay } from "@/lib/installments";

export type RecurringExpense = {
  id: string;
  description: string;
  category: ExpenseCategory;
  amount: number;
  dayOfMonth: number;
  startMonth: string;
  active: boolean;
  lastGeneratedMonth?: string;
};

function toRecurring(row: {
  id: string;
  description: string;
  category: string;
  amount: number;
  dayOfMonth: number;
  startMonth: string;
  active: boolean;
  lastGeneratedMonth: string | null;
}): RecurringExpense {
  return {
    id: row.id,
    description: row.description,
    category: row.category as ExpenseCategory,
    amount: row.amount,
    dayOfMonth: row.dayOfMonth,
    startMonth: row.startMonth,
    active: row.active,
    lastGeneratedMonth: row.lastGeneratedMonth ?? undefined,
  };
}

export async function getAllRecurringExpenses(): Promise<RecurringExpense[]> {
  const rows = await db.recurringExpense.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toRecurring);
}

export type RecurringInput = { description: string; category: ExpenseCategory; amount: number; dayOfMonth: number; startMonth: string };

export async function createRecurringExpense(input: RecurringInput): Promise<RecurringExpense> {
  return toRecurring(await db.recurringExpense.create({ data: input }));
}

export async function updateRecurringExpense(id: string, input: RecurringInput): Promise<RecurringExpense | null> {
  const existing = await db.recurringExpense.findUnique({ where: { id } });
  if (!existing) return null;
  return toRecurring(await db.recurringExpense.update({ where: { id }, data: input }));
}

/**
 * Pausa ou retoma. Ao retomar, os meses em que ficou pausada não são lançados de volta: conta como já lançado até o mês anterior a hoje
 * (o mês atual ainda é lançado se o dia escolhido já passou).
 */
export async function setRecurringActive(id: string, active: boolean, today: string): Promise<boolean> {
  const existing = await db.recurringExpense.findUnique({ where: { id } });
  if (!existing) return false;
  const previousMonth = addMonthsToDay(`${today.slice(0, 7)}-01`, -1).slice(0, 7);
  const lastGeneratedMonth = active && (!existing.lastGeneratedMonth || existing.lastGeneratedMonth < previousMonth) ? previousMonth : existing.lastGeneratedMonth;
  await db.recurringExpense.update({ where: { id }, data: { active, lastGeneratedMonth } });
  if (active) await generateDueRecurringExpenses(today);
  return true;
}

export async function deleteRecurringExpense(id: string): Promise<boolean> {
  const result = await db.recurringExpense.deleteMany({ where: { id } });
  return result.count > 0;
}

/**
 * Lança as despesas recorrentes que já venceram (uma por mês, no dia escolhido) e ainda não foram lançadas. Pode rodar quantas vezes
 * quiser (o cron diário e a abertura da tela de Finanças): cada mês só é lançado uma vez, mesmo com duas execuções ao mesmo tempo.
 * Recupera meses atrasados se ninguém abriu o painel. Devolve quantas despesas foram criadas.
 */
export async function generateDueRecurringExpenses(today: string): Promise<number> {
  const templates = await db.recurringExpense.findMany({ where: { active: true } });
  let created = 0;
  for (const t of templates) {
    const currentMonth = today.slice(0, 7);
    const from = t.lastGeneratedMonth ? monthsBetween(t.lastGeneratedMonth, currentMonth).slice(1) : monthsBetween(t.startMonth, currentMonth);
    const due = from.filter((month) => month >= t.startMonth && occurrenceDay(month, t.dayOfMonth) <= today);
    if (due.length === 0) continue;
    // Reserva os meses de forma atômica: se outra execução já levou, esta não cria nada.
    const claimed = await db.recurringExpense.updateMany({
      where: { id: t.id, lastGeneratedMonth: t.lastGeneratedMonth },
      data: { lastGeneratedMonth: due[due.length - 1] },
    });
    if (claimed.count !== 1) continue;
    for (const month of due) {
      await db.expense.create({
        data: {
          description: t.description,
          category: t.category,
          totalValue: t.amount,
          purchaseDate: new Date(`${occurrenceDay(month, t.dayOfMonth)}T00:00:00.000Z`),
          notes: "Lançada automaticamente (despesa recorrente)",
        },
      });
      created += 1;
    }
  }
  return created;
}
