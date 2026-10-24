"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { createExpense, deleteExpense, setInstallmentPaid, updateExpense } from "@/server/repositories/expense-repository";
import { setCashBalance } from "@/server/repositories/settings-repository";
import { storeDayKey } from "@/lib/store-time";
import { withMutationFallback } from "@/lib/db-fallback";
import type { Expense } from "@/server/types";

const expenseFormSchema = z.object({
  description: z.string().min(2, "Descreva a despesa."),
  category: z.enum(["equipamento", "material", "embalagem", "operacional"]),
  quantity: z.number().min(0).optional(),
  unitValue: z.number().min(0).optional(),
  totalValue: z.number("Informe um valor válido.").min(0.01, "Informe um valor maior que zero."),
  purchaseDate: z.string().min(1, "Informe a data da compra."),
  notes: z.string().optional(),
  installments: z.number().int("Use um número inteiro de parcelas.").min(1, "Use pelo menos 1 parcela.").max(60, "No máximo 60 parcelas.").optional(),
  firstDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida para a 1ª parcela.")
    .optional()
    .or(z.literal("")),
});

export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;
export type ExpenseMutationResult = { success: true; expense: Expense } | { success: false; error: string };

export async function createExpenseAction(input: ExpenseFormInput): Promise<ExpenseMutationResult> {
  const session = await auth();
  if (!ADMIN_AUTH_DISABLED && session?.user?.role !== "admin") {
    return { success: false, error: "Acesso restrito ao administrador." };
  }

  const parsed = expenseFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const result = await withMutationFallback(async () => {
    const { firstDueDate, installments, ...rest } = parsed.data;
    const parcelado = (installments ?? 1) > 1;
    const expense = await createExpense({ ...rest, installments: installments ?? 1, firstDueDate: parcelado && firstDueDate ? firstDueDate : undefined });
    return { success: true, expense } as ExpenseMutationResult;
  });
  if (result.success) revalidatePath("/admin/financas");
  return result;
}

/** Corrige uma despesa já lançada (qualquer campo, inclusive passar de à vista para parcelada). */
export async function updateExpenseAction(id: string, input: ExpenseFormInput): Promise<ExpenseMutationResult> {
  const session = await auth();
  if (!ADMIN_AUTH_DISABLED && session?.user?.role !== "admin") {
    return { success: false, error: "Acesso restrito ao administrador." };
  }

  const parsed = expenseFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const result = await withMutationFallback(async () => {
    const { firstDueDate, installments, notes, ...rest } = parsed.data;
    const parcelado = (installments ?? 1) > 1;
    return updateExpense(id, {
      ...rest,
      notes: notes?.trim() ? notes : undefined,
      installments: installments ?? 1,
      firstDueDate: parcelado && firstDueDate ? firstDueDate : undefined,
    });
  });
  if (result.success) revalidatePath("/admin/financas");
  return result;
}

/**
 * Marca uma parcela como paga antes do vencimento (o dinheiro sai do caixa na data informada, por padrão hoje) ou desfaz a marcação.
 * Parcela que já venceu conta como paga sozinha, então só as futuras precisam disso.
 */
export async function setInstallmentPaidAction(id: string, number: number, paid: boolean, paidOn?: string): Promise<ExpenseMutationResult> {
  const session = await auth();
  if (!ADMIN_AUTH_DISABLED && session?.user?.role !== "admin") {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  const today = storeDayKey(new Date());
  const day = paidOn || today;
  if (paid && (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(new Date(`${day}T00:00:00.000Z`).getTime()))) {
    return { success: false, error: "Informe uma data válida." };
  }
  if (paid && day > today) return { success: false, error: "A data do pagamento não pode ser no futuro." };

  const result = await withMutationFallback(() => setInstallmentPaid(id, number, paid ? day : null));
  if (result.success) {
    revalidatePath("/admin/financas");
    revalidatePath("/admin");
  }
  return result;
}

export type DeleteExpenseMutationResult = { success: true } | { success: false; error: string };

export async function deleteExpenseAction(id: string): Promise<DeleteExpenseMutationResult> {
  const session = await auth();
  if (!ADMIN_AUTH_DISABLED && session?.user?.role !== "admin") {
    return { success: false, error: "Acesso restrito ao administrador." };
  }

  const result = await withMutationFallback(() => deleteExpense(id));
  if (result.success) revalidatePath("/admin/financas");
  return result;
}

/** Informa quanto há em conta e a partir de que dia vendas pagas e despesas passam a mexer no "Em caixa". */
export async function saveCashBalanceAction(balance: number, date: string): Promise<{ success: true } | { success: false; error: string }> {
  const session = await auth();
  if (!ADMIN_AUTH_DISABLED && session?.user?.role !== "admin") {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  if (!Number.isFinite(balance) || Math.abs(balance) > 100_000_000) return { success: false, error: "Informe um valor válido." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00.000Z`).getTime())) {
    return { success: false, error: "Informe uma data válida." };
  }
  if (date > storeDayKey(new Date())) return { success: false, error: "A data não pode ser no futuro." };
  const result = await withMutationFallback(async () => {
    await setCashBalance(Math.round(balance * 100) / 100, date);
    return { success: true as const };
  });
  if (result.success) {
    revalidatePath("/admin/financas");
    revalidatePath("/admin");
  }
  return result;
}
