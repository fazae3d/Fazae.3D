"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { createExpense, deleteExpense } from "@/server/repositories/expense-repository";
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
    const expense = await createExpense(parsed.data);
    return { success: true, expense } as ExpenseMutationResult;
  });
  if (result.success) revalidatePath("/admin/financas");
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
