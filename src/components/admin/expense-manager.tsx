"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction, deleteExpenseAction } from "@/app/admin/financas/actions";
import { Select } from "@/components/select";
import { formatPrice } from "@/lib/format";
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

export function ExpenseManager({ expenses }: { expenses: Expense[] }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("material");
  const [quantity, setQuantity] = useState("");
  const [unitValue, setUnitValue] = useState("");
  const [totalValue, setTotalValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const calcTotal = () => {
    const q = Number(quantity) || 0;
    const u = Number(unitValue) || 0;
    if (q > 0 && u > 0) setTotalValue(String(Math.round(q * u * 100) / 100));
  };

  const handleAdd = async () => {
    setError(null);
    setSubmitting(true);
    const result = await createExpenseAction({
      description: description.trim(),
      category,
      quantity: quantity ? Number(quantity) : undefined,
      unitValue: unitValue ? Number(unitValue) : undefined,
      totalValue: Number(totalValue) || 0,
      purchaseDate,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setDescription("");
    setQuantity("");
    setUnitValue("");
    setTotalValue("");
    setPurchaseDate(todayIso());
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    await deleteExpenseAction(id);
    setDeletingId(null);
    router.refresh();
  };

  return (
    <div className="border border-mist p-5">
      <p className="label-caps mb-4 text-xs text-graphite">
        Despesas {expenses.length > 0 && `(${expenses.length})`}
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
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={submitting || !description.trim() || !totalValue}
        className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {submitting ? "Adicionando..." : "Adicionar despesa"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {expenses.length > 0 && (
        <ul className="mt-6 max-h-96 divide-y divide-mist overflow-y-auto border-t border-mist">
          {expenses.map((expense) => (
            <li key={expense.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className="truncate text-paper">{expense.description}</p>
                <p className="text-xs text-graphite">
                  {CATEGORY_OPTIONS.find((c) => c.value === expense.category)?.label} ·{" "}
                  {new Date(expense.purchaseDate).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  {expense.quantity ? ` · ${expense.quantity}x` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="font-medium">{formatPrice(expense.totalValue)}</span>
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
          ))}
        </ul>
      )}
    </div>
  );
}
