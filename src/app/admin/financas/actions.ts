"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { createExpense, deleteExpense, setInstallmentAmount, setInstallmentPaid, updateExpense } from "@/server/repositories/expense-repository";
import {
  createRecurringExpense,
  deleteRecurringExpense,
  generateDueRecurringExpenses,
  setRecurringActive,
  updateRecurringExpense,
} from "@/server/repositories/recurring-expense-repository";
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
  paymentMethod: z.enum(["pix", "dinheiro", "debito", "cartao"]).optional(),
  cardName: z.string().trim().max(40, "O nome do cartão passa de 40 letras.").optional(),
  installments: z.number().int("Use um número inteiro de parcelas.").min(1, "Use pelo menos 1 parcela.").max(60, "No máximo 60 parcelas.").optional(),
  firstDueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida para a 1ª parcela.")
    .optional()
    .or(z.literal("")),
});

export type ExpenseFormInput = z.infer<typeof expenseFormSchema>;
export type ExpenseMutationResult = { success: true; expense: Expense } | { success: false; error: string };

/**
 * Arruma o que veio do formulário: o vencimento só vale para compra parcelada ou no cartão (fatura), o nome do cartão só para cartão,
 * e parcelas só fazem sentido no cartão (Pix, dinheiro e débito são à vista).
 */
function normalizeExpense(data: ExpenseFormInput) {
  const method = data.paymentMethod;
  const installments = method && method !== "cartao" ? 1 : (data.installments ?? 1);
  const scheduled = installments > 1 || method === "cartao";
  const card = data.cardName?.trim();
  return {
    description: data.description,
    category: data.category,
    quantity: data.quantity,
    unitValue: data.unitValue,
    totalValue: data.totalValue,
    purchaseDate: data.purchaseDate,
    notes: data.notes?.trim() ? data.notes : undefined,
    installments,
    firstDueDate: scheduled && data.firstDueDate ? data.firstDueDate : undefined,
    paymentMethod: method,
    cardName: method === "cartao" && card ? card : undefined,
  };
}

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
    const expense = await createExpense(normalizeExpense(parsed.data));
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
    return updateExpense(id, normalizeExpense(parsed.data));
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

/** Ajusta o valor real de uma parcela (juros, entrada diferente) ou volta ao valor calculado (amount = null). */
export async function setInstallmentAmountAction(id: string, number: number, amount: number | null): Promise<ExpenseMutationResult> {
  const session = await auth();
  if (!ADMIN_AUTH_DISABLED && session?.user?.role !== "admin") {
    return { success: false, error: "Acesso restrito ao administrador." };
  }
  if (amount !== null && (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000)) return { success: false, error: "Informe um valor válido." };

  const result = await withMutationFallback(() => setInstallmentAmount(id, number, amount));
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

const recurringSchema = z.object({
  description: z.string().trim().min(2, "Descreva a despesa."),
  category: z.enum(["equipamento", "material", "embalagem", "operacional"]),
  amount: z.number("Informe um valor válido.").min(0.01, "Informe um valor maior que zero.").max(10_000_000, "Valor alto demais."),
  dayOfMonth: z.number("Informe o dia do mês.").int("Use um dia inteiro.").min(1, "O dia vai de 1 a 31.").max(31, "O dia vai de 1 a 31."),
  startMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Informe o mês em que começa."),
});

export type RecurringFormInput = z.infer<typeof recurringSchema>;
export type RecurringMutationResult = { success: true } | { success: false; error: string };

async function requireAdmin(): Promise<RecurringMutationResult> {
  const session = await auth();
  if (!ADMIN_AUTH_DISABLED && session?.user?.role !== "admin") return { success: false, error: "Acesso restrito ao administrador." };
  return { success: true };
}

/** Cria uma despesa que se repete todo mês e já lança as que venceram desde o mês de início. */
export async function createRecurringExpenseAction(input: RecurringFormInput): Promise<RecurringMutationResult> {
  const denied = await requireAdmin();
  if (!denied.success) return denied;
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const result = await withMutationFallback(async () => {
    await createRecurringExpense(parsed.data);
    await generateDueRecurringExpenses(storeDayKey(new Date()));
    return { success: true } as RecurringMutationResult;
  });
  if (result.success) revalidatePath("/admin/financas");
  return result;
}

export async function updateRecurringExpenseAction(id: string, input: RecurringFormInput): Promise<RecurringMutationResult> {
  const denied = await requireAdmin();
  if (!denied.success) return denied;
  const parsed = recurringSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const result = await withMutationFallback(async () => {
    const updated = await updateRecurringExpense(id, parsed.data);
    if (!updated) return { success: false, error: "Despesa recorrente não encontrada." } as RecurringMutationResult;
    await generateDueRecurringExpenses(storeDayKey(new Date()));
    return { success: true } as RecurringMutationResult;
  });
  if (result.success) revalidatePath("/admin/financas");
  return result;
}

/** Pausa ou retoma a despesa recorrente. Ao retomar, os meses em que ficou pausada não são lançados de volta. */
export async function setRecurringActiveAction(id: string, active: boolean): Promise<RecurringMutationResult> {
  const denied = await requireAdmin();
  if (!denied.success) return denied;
  const result = await withMutationFallback(async () => {
    const ok = await setRecurringActive(id, active, storeDayKey(new Date()));
    if (!ok) return { success: false, error: "Despesa recorrente não encontrada." } as RecurringMutationResult;
    return { success: true } as RecurringMutationResult;
  });
  if (result.success) revalidatePath("/admin/financas");
  return result;
}

export async function deleteRecurringExpenseAction(id: string): Promise<RecurringMutationResult> {
  const denied = await requireAdmin();
  if (!denied.success) return denied;
  const result = await withMutationFallback(async () => {
    await deleteRecurringExpense(id);
    return { success: true } as RecurringMutationResult;
  });
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
