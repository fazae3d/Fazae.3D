import { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import type { Expense, ExpenseCategory } from "../types";

/** Lê o JSON salvo (número da parcela → dia) ignorando o que não tiver o formato esperado. */
function parsePaid(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const entries = Object.entries(value as Record<string, unknown>).filter(([k, v]) => /^\d+$/.test(k) && typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v));
  return entries.length > 0 ? (Object.fromEntries(entries) as Record<string, string>) : undefined;
}

function toExpense(row: {
  id: string;
  description: string;
  category: string;
  quantity: number | null;
  unitValue: number | null;
  totalValue: number;
  purchaseDate: Date;
  notes: string | null;
  installments: number;
  firstDueDate: Date | null;
  paidInstallments: unknown;
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
    installments: row.installments,
    firstDueDate: row.firstDueDate?.toISOString(),
    paidInstallments: parsePaid(row.paidInstallments),
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
  installments?: number;
  firstDueDate?: string;
};

export async function createExpense(input: CreateExpenseInput): Promise<Expense> {
  const row = await db.expense.create({
    data: {
      ...input,
      purchaseDate: new Date(input.purchaseDate),
      firstDueDate: input.firstDueDate ? new Date(input.firstDueDate) : undefined,
    },
  });
  return toExpense(row);
}

export type UpdateExpenseResult = { success: true; expense: Expense } | { success: false; error: string };

/** Edita a compra. Parcelas já marcadas como pagas antes do vencimento continuam marcadas (as que passarem do novo total saem). */
export async function updateExpense(id: string, input: CreateExpenseInput): Promise<UpdateExpenseResult> {
  const existing = await db.expense.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Despesa não encontrada." };
  const count = Math.max(1, input.installments ?? 1);
  const kept = Object.fromEntries(Object.entries(parsePaid(existing.paidInstallments) ?? {}).filter(([n]) => count > 1 && Number(n) <= count));
  const row = await db.expense.update({
    where: { id },
    data: {
      description: input.description,
      category: input.category,
      quantity: input.quantity ?? null,
      unitValue: input.unitValue ?? null,
      totalValue: input.totalValue,
      purchaseDate: new Date(input.purchaseDate),
      notes: input.notes ?? null,
      installments: count,
      firstDueDate: count > 1 && input.firstDueDate ? new Date(input.firstDueDate) : null,
      paidInstallments: Object.keys(kept).length > 0 ? kept : Prisma.DbNull,
    },
  });
  return { success: true, expense: toExpense(row) };
}

/** Marca (paidOn = dia) ou desmarca (paidOn = null) o pagamento antecipado de uma parcela. */
export async function setInstallmentPaid(id: string, number: number, paidOn: string | null): Promise<UpdateExpenseResult> {
  const existing = await db.expense.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Despesa não encontrada." };
  if (!Number.isInteger(number) || number < 1 || number > existing.installments) return { success: false, error: "Parcela inexistente." };
  const paid = { ...(parsePaid(existing.paidInstallments) ?? {}) };
  if (paidOn) paid[String(number)] = paidOn;
  else delete paid[String(number)];
  const row = await db.expense.update({
    where: { id },
    data: { paidInstallments: Object.keys(paid).length > 0 ? paid : Prisma.DbNull },
  });
  return { success: true, expense: toExpense(row) };
}

export type DeleteExpenseResult = { success: true } | { success: false; error: string };

export async function deleteExpense(id: string): Promise<DeleteExpenseResult> {
  const existing = await db.expense.findUnique({ where: { id } });
  if (!existing) return { success: false, error: "Despesa não encontrada." };
  await db.expense.delete({ where: { id } });
  return { success: true };
}
