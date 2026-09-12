import { db } from "../db";
import type { Expense, ExpenseCategory } from "../types";

function toExpense(row: {
  id: string;
  description: string;
  category: string;
  quantity: number | null;
  unitValue: number | null;
  totalValue: number;
  purchaseDate: Date;
  notes: string | null;
  createdAt: Date;
}): Expense {
  return {
    id: row.id,
    description: row.description,
    category: row.category as ExpenseCategory,
    quantity: row.quantity ?? undefined,
    unitValue: row.unitValue ?? undefined,
    totalValue: row.totalValue,
    purchaseDate: row.purchaseDate.toISOString(),
    notes: row.notes ?? undefined,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAllExpenses(): Promise<Expense[]> {
  const rows = await db.expense.findMany({ orderBy: { purchaseDate: "desc" } });
  return rows.map(toExpense);
}

export type CreateExpenseInput = {
  description: string;
  category: ExpenseCategory;
  quantity?: number;
  unitValue?: number;
  totalValue: number;
  purchaseDate: string;
  notes?: string;
};

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const row = await db.expense.create({
    data: { ...input, purchaseDate: new Date(input.purchaseDate) },
  });
  return toExpense(row);
}

export type DeleteExpenseResult = { success: true } | { success: false; error: string };

export async function deleteExpense(id: string): Promise<DeleteExpenseResult> {
  const existing = await db.expense.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Despesa não encontrada." };
  await db.expense.delete({ where: { id } });
  return { success: true };
}
