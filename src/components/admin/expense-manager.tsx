"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction, deleteExpenseAction, updateExpenseAction } from "@/app/admin/financas/actions";
import { InstallmentPayButton } from "@/components/admin/installment-pay-button";
import { Select } from "@/components/select";
import { formatPrice } from "@/lib/format";
import { expenseInstallments, installmentCount, installmentSummary, isInstallmentPaid } from "@/lib/installments";
import type { Expense, ExpenseCategory } from "@/server/types";

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "equipamento", label: "Equipamento" },
  { value: "material", label: "Material/Insumo" },
  { value: "embalagem", label: "Embalagem" },
  { value: "operacional", label: "Operacional" },
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function dayLabel(day: string) {
  return new Date(`${day}T00:00:00.000Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function ExpenseManager({ expenses, today }: { expenses: Expense[]; today: string }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("material");
  const [quantity, setQuantity] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [installments, setInstallments] = useState("1");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const installmentsNumber = Math.max(1, Math.floor(Number(installments) || 1));
  const parcelado = installmentsNumber > 1;
  const previewEach = parcelado && Number(totalValue) > 0 ? Math.round((Number(totalValue) / installmentsNumber) * 100) / 100 : 0;

  const calcTotal = () => {
    const q = Number(quantity) || 0;
    const u = Number(unitValue) || 0;
    if (q > 0 && u > 0) setTotalValue(String(Math.round(q * u * 100) / 100));
  };

  const resetForm = () => {
    setEditingId(null);
    setDescription("");
    setCategory("material");
    setQuantity("");
    setUnitValue("");
    setTotalValue("");
    setPurchaseDate(todayIso());
    setInstallments("1");
    setFirstDueDate("");
    setNotes("");
    setError(null);
  };

  /** Carrega a despesa no formulário para corrigir (vale para as antigas, à vista, e para as parceladas). */
  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setDescription(expense.description);
    setCategory(expense.category);
    setQuantity(expense.quantity ? String(expense.quantity) : "");
    setUnitValue(expense.unitValue ? String(expense.unitValue) : "");
    setTotalValue(String(expense.totalValue));
    setPurchaseDate(expense.purchaseDate.slice(0, 10));
    setInstallments(String(installmentCount(expense)));
    setFirstDueDate(expense.firstDueDate ? expense.firstDueDate.slice(0, 10) : "");
    setNotes(expense.notes ?? "");
    setError(null);
    document.getElementById("exp-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSave = async () => {
    setError(null);
    setSubmitting(true);
    const input = {
      description: description.trim(),
      category,
      quantity: quantity ? Number(quantity) : undefined,
      unitValue: unitValue ? Number(unitValue) : undefined,
      totalValue: Number(totalValue) || 0,
      purchaseDate,
      notes: notes || undefined,
      installments: Number(installments) || 1,
      firstDueDate: firstDueDate || undefined,
    };
    const result = editingId ? await updateExpenseAction(editingId, input) : await createExpenseAction(input);
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    resetForm();
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteExpenseAction(id);
    setDeletingId(null);
    router.refresh();
  };

  return (
    <div id="exp-form" className="border border-mist p-5">
      <p className="label-caps mb-4 text-xs text-graphite">
        {editingId ? "Editando despesa" : `Despesas ${expenses.length > 0 ? `(${expenses.length})` : ""}`}
      </p>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="flex flex-col gap-1.5 lg:col-span-1">
          <label className="label-caps text-[11px] text-graphite" htmlFor="exp-desc">
            Descrição
          </label>
          <input
            id="exp-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Filamento PLA Preto 5kg"
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[11px] text-graphite" htmlFor="exp-category">
            Categoria
          </label>
          <Select
            id="exp-category"
            value={category}
            onChange={(v) => setCategory(v as ExpenseCategory)}
            options={CATEGORY_OPTIONS.map((opt) => ({ value: opt.value, label: opt.label }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[11px] text-graphite" htmlFor="exp-date">
            Data da compra
          </label>
          <input
            id="exp-date"
            type="date"
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[11px] text-graphite" htmlFor="exp-qty">
            Quantidade (opcional)
          </label>
          <input
            id="exp-qty"
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={calcTotal}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[11px] text-graphite" htmlFor="exp-unit">
            Valor unitário (R$, opcional)
          </label>
          <input
            id="exp-unit"
            type="number"
            step="0.01"
            value={unitValue}
            onChange={(e) => setUnitValue(e.target.value)}
            onBlur={calcTotal}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[11px] text-graphite" htmlFor="exp-total">
            Valor total (R$)
          </label>
          <input
            id="exp-total"
            type="number"
            step="0.01"
            value={totalValue}
            onChange={(e) => setTotalValue(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[11px] text-graphite" htmlFor="exp-installments">
            Parcelas no cartão
          </label>
          <input
            id="exp-installments"
            type="number"
            min="1"
            max="60"
            step="1"
            value={installments}
            onChange={(e) => setInstallments(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
          <p className="text-[11px] text-graphite">1 = à vista. Em mais de 1, o valor total é dividido por mês.</p>
        </div>
        {parcelado ? (
          <div className="flex flex-col gap-1.5">
            <label className="label-caps text-[11px] text-graphite" htmlFor="exp-first-due">
              Vencimento da 1ª parcela
            </label>
            <input
              id="exp-first-due"
              type="date"
              value={firstDueDate || purchaseDate}
              onChange={(e) => setFirstDueDate(e.target.value)}
              className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
            />
            <p className="text-[11px] text-graphite">
              {previewEach ? `${installmentsNumber}x de ${formatPrice(previewEach)}. ` : ""}A cada vencimento a parcela sai do caixa sozinha.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting || !description.trim() || !totalValue}
          className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
        >
          {submitting ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar despesa"}
        </button>
        {editingId ? (
          <button type="button" onClick={resetForm} className="label-caps text-xs text-graphite hover:text-ink">
            Cancelar edição
          </button>
        ) : null}
      </div>
      {editingId ? (
        <p className="mt-2 text-[11px] text-graphite">Parcelas já marcadas como pagas continuam marcadas. Mudar o valor ou o número de parcelas recalcula as demais.</p>
      ) : null}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {expenses.length > 0 && (
        <ul className="mt-6 max-h-96 divide-y divide-mist overflow-y-auto border-t border-mist">
          {expenses.map((expense) => {
            const plan = installmentCount(expense) > 1 ? installmentSummary(expense, today) : null;
            return (
            <li key={expense.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate text-ink">{expense.description}</p>
                <p className="text-xs text-graphite">
                  {CATEGORY_OPTIONS.find((c) => c.value === expense.category)?.label} ·{" "}
                  {new Date(expense.purchaseDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  {expense.quantity ? ` · ${expense.quantity}x` : ""}
                </p>
                {plan ? (
                  <p className="text-xs text-graphite">
                    {plan.of}x de {formatPrice(expense.totalValue / plan.of)} · {plan.paid} de {plan.of} pagas ({formatPrice(plan.paidAmount)})
                    {plan.remaining > 0 && plan.nextDay
                      ? ` · faltam ${formatPrice(plan.remainingAmount)}, próxima em ${dayLabel(plan.nextDay)}`
                      : " · quitada"}
                  </p>
                ) : null}
                {plan ? (
                  <details className="mt-1 text-xs">
                    <summary className="cursor-pointer text-petrol">Ver parcelas</summary>
                    <ul className="mt-1 space-y-1">
                      {expenseInstallments(expense).map((i) => {
                        const paid = isInstallmentPaid(i, today);
                        const early = Boolean(i.paidOn);
                        return (
                          <li key={i.number} className="flex items-center justify-between gap-3">
                            <span className={paid ? "text-graphite" : "text-ink"}>
                              {i.number}/{i.of} · vence {dayLabel(i.day)} · {formatPrice(i.amount)}
                              {early ? ` · paga em ${dayLabel(i.paidOn!)} (antecipada)` : paid ? " · paga" : " · a pagar"}
                            </span>
                            {!paid || early ? <InstallmentPayButton expenseId={expense.id} number={i.number} paid={early} /> : null}
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="font-medium">{formatPrice(expense.totalValue)}</span>
                <button type="button" onClick={() => startEdit(expense)} className="label-caps text-[11px] text-petrol hover:underline">
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(expense.id)}
                  disabled={deletingId === expense.id}
                  className="label-caps text-[11px] text-graphite hover:text-red-600 disabled:opacity-60"
                >
                  Remover
                </button>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
