"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExpenseAction, deleteExpenseAction, updateExpenseAction } from "@/app/admin/financas/actions";
import { InstallmentAmountEditor, InstallmentPayButton } from "@/components/admin/installment-pay-button";
import { Select } from "@/components/select";
import { formatPrice } from "@/lib/format";
import {
  PAYMENT_METHODS,
  expenseInstallments,
  hasSchedule,
  installmentCount,
  installmentInterest,
  installmentSummary,
  isInstallmentPaid,
  paymentMethodLabel,
} from "@/lib/installments";
import type { Expense, ExpenseCategory } from "@/server/types";

const CATEGORY_OPTIONS: { value: ExpenseCategory; label: string }[] = [
  { value: "equipamento", label: "Equipamento" },
  { value: "material", label: "Material/Insumo" },
  { value: "embalagem", label: "Embalagem" },
  { value: "operacional", label: "Operacional" },
];

const INPUT = "border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol";
const LABEL = "label-caps text-[11px] text-graphite";

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
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [cardName, setCardName] = useState("");
  const [installments, setInstallments] = useState("1");
  const [firstDueDate, setFirstDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isCard = paymentMethod === "cartao";
  const installmentsNumber = isCard ? Math.max(1, Math.floor(Number(installments) || 1)) : 1;
  const parcelado = installmentsNumber > 1;
  const previewEach = parcelado && Number(totalValue) > 0 ? Math.round((Number(totalValue) / installmentsNumber) * 100) / 100 : 0;
  // Nomes de cartão já usados, para sugerir na hora de digitar.
  const knownCards = [...new Set(expenses.map((e) => e.cardName).filter((c): c is string => Boolean(c)))];

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
    setPaymentMethod("pix");
    setCardName("");
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
    // Lançadas antes de existir "forma de pagamento": parcelada ou com vencimento é cartão, o resto à vista.
    setPaymentMethod(expense.paymentMethod ?? (hasSchedule(expense) ? "cartao" : "pix"));
    setCardName(expense.cardName ?? "");
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
      paymentMethod: paymentMethod as "pix" | "dinheiro" | "debito" | "cartao",
      cardName: isCard && cardName.trim() ? cardName.trim() : undefined,
      installments: installmentsNumber,
      firstDueDate: isCard && firstDueDate ? firstDueDate : undefined,
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
          <label className={LABEL} htmlFor="exp-desc">
            Descrição
          </label>
          <input id="exp-desc" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex: Filamento PLA Preto 5kg" className={INPUT} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="exp-category">
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
          <label className={LABEL} htmlFor="exp-date">
            Data da compra
          </label>
          <input id="exp-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} className={INPUT} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="exp-qty">
            Quantidade (opcional)
          </label>
          <input id="exp-qty" type="number" step="0.01" value={quantity} onChange={(e) => setQuantity(e.target.value)} onBlur={calcTotal} className={INPUT} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="exp-unit">
            Valor unitário (R$, opcional)
          </label>
          <input id="exp-unit" type="number" step="0.01" value={unitValue} onChange={(e) => setUnitValue(e.target.value)} onBlur={calcTotal} className={INPUT} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="exp-total">
            Valor total (R$)
          </label>
          <input id="exp-total" type="number" step="0.01" value={totalValue} onChange={(e) => setTotalValue(e.target.value)} className={INPUT} />
          <p className="text-[11px] text-graphite">Com juros no cartão, ponha o preço da compra e ajuste cada parcela depois.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={LABEL} htmlFor="exp-method">
            Pago com
          </label>
          <Select id="exp-method" value={paymentMethod} onChange={setPaymentMethod} options={PAYMENT_METHODS.map((m) => ({ value: m.value, label: m.label }))} />
          <p className="text-[11px] text-graphite">Pix, dinheiro e débito saem do caixa no dia da compra.</p>
        </div>
        {isCard ? (
          <>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL} htmlFor="exp-card">
                Cartão
              </label>
              <input
                id="exp-card"
                list="exp-cards"
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                placeholder="Ex: Nubank"
                maxLength={40}
                className={INPUT}
              />
              <datalist id="exp-cards">
                {knownCards.map((card) => (
                  <option key={card} value={card} />
                ))}
              </datalist>
              <p className="text-[11px] text-graphite">Serve para somar a fatura de cada cartão.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL} htmlFor="exp-installments">
                Parcelas
              </label>
              <input id="exp-installments" type="number" min="1" max="60" step="1" value={installments} onChange={(e) => setInstallments(e.target.value)} className={INPUT} />
              <p className="text-[11px] text-graphite">1 = uma vez só. Em mais de 1, o valor é dividido por mês.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={LABEL} htmlFor="exp-first-due">
                {parcelado ? "Vencimento da 1ª parcela" : "Vencimento da fatura"}
              </label>
              <input id="exp-first-due" type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} className={INPUT} />
              <p className="text-[11px] text-graphite">
                {previewEach ? `${installmentsNumber}x de ${formatPrice(previewEach)}. ` : ""}
                {firstDueDate
                  ? "Sai do caixa sozinho em cada vencimento."
                  : parcelado
                    ? "Em branco: a 1ª parcela vence no dia da compra."
                    : "Em branco: conta no dia da compra."}
              </p>
            </div>
          </>
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
        <p className="mt-2 text-[11px] text-graphite">
          Parcelas já marcadas como pagas continuam marcadas. Se mudar o valor total ou o número de parcelas, os valores ajustados de cada parcela voltam ao cálculo normal.
        </p>
      ) : null}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {expenses.length > 0 && (
        <ul className="mt-6 max-h-[32rem] divide-y divide-mist overflow-y-auto border-t border-mist">
          {expenses.map((expense) => {
            const scheduled = hasSchedule(expense);
            const plan = scheduled ? installmentSummary(expense, today) : null;
            const interest = scheduled ? installmentInterest(expense) : 0;
            const method = paymentMethodLabel(expense.paymentMethod);
            const many = plan ? plan.of > 1 : false;
            return (
              <li key={expense.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate text-ink">{expense.description}</p>
                  <p className="text-xs text-graphite">
                    {CATEGORY_OPTIONS.find((c) => c.value === expense.category)?.label} · {dayLabel(expense.purchaseDate.slice(0, 10))}
                    {expense.quantity ? ` · ${expense.quantity}x` : ""}
                    {method ? ` · ${method}${expense.cardName ? ` ${expense.cardName}` : ""}` : ""}
                  </p>
                  {plan ? (
                    <p className="text-xs text-graphite">
                      {many ? (
                        <>
                          {plan.of}x de {formatPrice(expense.totalValue / plan.of)} · {plan.paid} de {plan.of} pagas ({formatPrice(plan.paidAmount)})
                          {plan.remaining > 0 && plan.nextDay
                            ? ` · faltam ${formatPrice(plan.remainingAmount)}, próxima em ${dayLabel(plan.nextDay)}`
                            : " · quitada"}
                        </>
                      ) : plan.remaining > 0 && plan.nextDay ? (
                        `Fatura de ${formatPrice(plan.remainingAmount)} vence em ${dayLabel(plan.nextDay)}`
                      ) : (
                        "Fatura paga"
                      )}
                      {interest > 0.005 ? ` · juros de ${formatPrice(interest)}` : ""}
                    </p>
                  ) : null}
                  {plan ? (
                    <details className="mt-1 text-xs">
                      <summary className="cursor-pointer text-petrol">{many ? "Ver parcelas" : "Ver fatura"}</summary>
                      <ul className="mt-1 space-y-1.5">
                        {expenseInstallments(expense).map((i) => {
                          const paid = isInstallmentPaid(i, today);
                          const early = Boolean(i.paidOn);
                          return (
                            <li key={i.number} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                              <span className={paid ? "text-graphite" : "text-ink"}>
                                {many ? `${i.number}/${i.of} · ` : ""}vence {dayLabel(i.day)} · {formatPrice(i.amount)}
                                {i.adjusted ? " (ajustada)" : ""}
                                {early ? ` · paga em ${dayLabel(i.paidOn!)} (antecipada)` : paid ? " · paga" : " · a pagar"}
                              </span>
                              <span className="flex flex-wrap items-center gap-3">
                                <InstallmentAmountEditor expenseId={expense.id} number={i.number} amount={i.amount} adjusted={i.adjusted} />
                                {!paid || early ? <InstallmentPayButton expenseId={expense.id} number={i.number} paid={early} today={today} /> : null}
                              </span>
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
