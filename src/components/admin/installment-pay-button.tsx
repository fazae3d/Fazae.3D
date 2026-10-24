"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setInstallmentAmountAction, setInstallmentPaidAction } from "@/app/admin/financas/actions";
import { parseMoneyInput } from "@/lib/payment";

const SMALL_INPUT = "border border-mist bg-transparent px-2 py-1 text-xs outline-none focus:border-petrol";

/**
 * Marca uma parcela futura como paga (o dinheiro sai do caixa no dia escolhido, por padrão hoje) ou desfaz a marcação. Parcela que já
 * venceu conta como paga sozinha, então o botão só aparece nas que ainda não venceram ou nas que foram marcadas antes.
 */
export function InstallmentPayButton({ expenseId, number, paid, today }: { expenseId: string; number: number; paid: boolean; today: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [day, setDay] = useState(today);
  const [error, setError] = useState<string | null>(null);

  const run = async (nextPaid: boolean) => {
    setPending(true);
    setError(null);
    const result = await setInstallmentPaidAction(expenseId, number, nextPaid, nextPaid ? day : undefined);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setChoosing(false);
    router.refresh();
  };

  if (paid) {
    return (
      <span className="inline-flex flex-col items-end">
        <button type="button" onClick={() => run(false)} disabled={pending} className="label-caps text-[11px] text-petrol hover:underline disabled:opacity-60">
          {pending ? "Salvando..." : "Desfazer"}
        </button>
        {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      {choosing ? (
        <span className="flex flex-wrap items-center justify-end gap-2">
          <label className="text-[11px] text-graphite">
            Paga em{" "}
            <input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} className={SMALL_INPUT} />
          </label>
          <button type="button" onClick={() => run(true)} disabled={pending || !day} className="label-caps text-[11px] text-petrol hover:underline disabled:opacity-60">
            {pending ? "Salvando..." : "Confirmar"}
          </button>
          <button type="button" onClick={() => setChoosing(false)} className="label-caps text-[11px] text-graphite hover:text-ink">
            Cancelar
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setChoosing(true)} className="label-caps text-[11px] text-petrol hover:underline">
          Marcar como paga
        </button>
      )}
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
    </span>
  );
}

/** Ajusta o valor real de uma parcela (juros, entrada diferente) ou volta ao valor calculado. */
export function InstallmentAmountEditor({ expenseId, number, amount, adjusted }: { expenseId: string; number: number; amount: number; adjusted: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(amount).replace(".", ","));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (next: number | null) => {
    setPending(true);
    setError(null);
    const result = await setInstallmentAmountAction(expenseId, number, next);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  };

  if (!editing) {
    return (
      <span className="inline-flex items-center gap-3">
        <button type="button" onClick={() => setEditing(true)} className="label-caps text-[11px] text-graphite hover:text-ink">
          Ajustar valor
        </button>
        {adjusted ? (
          <button type="button" onClick={() => save(null)} disabled={pending} className="label-caps text-[11px] text-graphite hover:text-ink disabled:opacity-60">
            Voltar ao calculado
          </button>
        ) : null}
        {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" aria-label="Valor da parcela" className={`${SMALL_INPUT} w-24`} />
      <button
        type="button"
        onClick={() => {
          const next = parseMoneyInput(value);
          if (next <= 0) setError("Informe um valor válido.");
          else void save(next);
        }}
        disabled={pending} className="label-caps text-[11px] text-petrol hover:underline disabled:opacity-60">
        {pending ? "Salvando..." : "Salvar"}
      </button>
      <button type="button" onClick={() => setEditing(false)} className="label-caps text-[11px] text-graphite hover:text-ink">
        Cancelar
      </button>
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
    </span>
  );
}
