"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createRecurringExpenseAction,
  deleteRecurringExpenseAction,
  setRecurringActiveAction,
  updateRecurringExpenseAction,
} from "@/app/admin/financas/actions";
import { Select } from "@/components/select";
import { formatPrice } from "@/lib/format";
import { parseMoneyInput } from "@/lib/payment";
import type { RecurringExpense } from "@/server/repositories/recurring-expense-repository";
import type { ExpenseCategory } from "@/server/types";

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "operacional", label: "Operacional" },
  { value: "material", label: "Material/Insumo" },
  { value: "embalagem", label: "Embalagem" },
  { value: "equipamento", label: "Equipamento" },
];

const INPUT = "border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol";
const LABEL = "label-caps text-[11px] text-graphite";

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return `${m}/${y}`;
}

/** Despesas que se repetem todo mês (energia, chip, assinaturas): lançadas sozinhas, uma por mês, e editáveis depois. */
export function RecurringExpenseManager({ items, currentMonth }: { items: RecurringExpense[]; currentMonth: string }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("operacional");
  const [amount, setAmount] = useState("");
  const [dayOfMonth, setDayOfMonth] = useState("5");
  const [startMonth, setStartMonth] = useState(currentMonth);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const reset = () => {
    setEditingId(null);
    setDescription("");
    setCategory("operacional");
    setAmount("");
    setDayOfMonth("5");
    setStartMonth(currentMonth);
    setError(null);
  };

  const startEdit = (item: RecurringExpense) => {
    setEditingId(item.id);
    setDescription(item.description);
    setCategory(item.category);
    setAmount(String(item.amount).replace(".", ","));
    setDayOfMonth(String(item.dayOfMonth));
    setStartMonth(item.startMonth);
    setError(null);
  };

  const run = async (action: () => Promise<{ success: boolean; error?: string }>) => {
    setPending(true);
    setError(null);
    const result = await action();
    setPending(false);
    if (!result.success) {
      setError(result.error ?? "Não foi possível salvar.");
      return false;
    }
    router.refresh();
    return true;
  };

  const save = async () => {
    const input = { description: description.trim(), category, amount: parseMoneyInput(amount), dayOfMonth: Number(dayOfMonth), startMonth };
    const ok = await run(() => (editingId ? updateRecurringExpenseAction(editingId, input) : createRecurringExpenseAction(input)));
    if (ok) reset();
  };

  return (
    <div className="mb-8 border border-mist p-5">
      <p className="label-caps text-xs text-graphite">Despesas que se repetem todo mês</p>
      <p className="mt-1 text-xs text-graphite">
        Energia, chip, assinaturas. Todo mês o sistema lança sozinho a despesa no dia escolhido; se o valor mudar (a conta de luz, por exemplo), é só
        editar aquele lançamento na lista de despesas. Se você já lançou este mês, comece no mês que vem.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className={LABEL} htmlFor="rec-desc">
            Descrição
          </label>
          <input id="rec-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Energia" className={INPUT} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="rec-category">
            Categoria
          </label>
          <Select id="rec-category" value={category} onChange={(v) => setCategory(v as ExpenseCategory)} options={CATEGORY_OPTIONS} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="rec-amount">
            Valor por mês (R$)
          </label>
          <input id="rec-amount" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" placeholder="0,00" className={INPUT} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="rec-day">
            Dia do mês
          </label>
          <input id="rec-day" type="number" min="1" max="31" step="1" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} className={INPUT} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="rec-start">
            Começa em
          </label>
          <input id="rec-start" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className={INPUT} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !description.trim() || !amount}
          className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
        >
          {pending ? "Salvando..." : editingId ? "Salvar alterações" : "Adicionar recorrente"}
        </button>
        {editingId ? (
          <button type="button" onClick={reset} className="label-caps text-xs text-graphite hover:text-ink">
            Cancelar edição
          </button>
        ) : null}
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

      {items.length > 0 ? (
        <ul className="mt-5 divide-y divide-mist border-t border-mist">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5 text-sm">
              <div className="min-w-0">
                <p className={`truncate ${item.active ? "text-ink" : "text-graphite line-through"}`}>{item.description}</p>
                <p className="text-xs text-graphite">
                  {CATEGORY_OPTIONS.find((c) => c.value === item.category)?.label} · todo dia {item.dayOfMonth} · desde {monthLabel(item.startMonth)}
                  {item.lastGeneratedMonth ? ` · último lançamento em ${monthLabel(item.lastGeneratedMonth)}` : " · ainda não lançada"}
                  {item.active ? "" : " · pausada"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="font-medium">{formatPrice(item.amount)}/mês</span>
                <button type="button" onClick={() => startEdit(item)} className="label-caps text-[11px] text-petrol hover:underline">
                  Editar
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => setRecurringActiveAction(item.id, !item.active))}
                  className="label-caps text-[11px] text-graphite hover:text-ink disabled:opacity-60"
                >
                  {item.active ? "Pausar" : "Retomar"}
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => deleteRecurringExpenseAction(item.id))}
                  className="label-caps text-[11px] text-graphite hover:text-red-600 disabled:opacity-60"
                >
                  Remover
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {items.length > 0 ? <p className="mt-2 text-[11px] text-graphite">Remover ou pausar não apaga o que já foi lançado.</p> : null}
    </div>
  );
}
