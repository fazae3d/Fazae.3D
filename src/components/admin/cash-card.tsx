"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/admin/toast";
import { saveCashBalanceAction } from "@/app/admin/financas/actions";
import { formatPrice } from "@/lib/format";
import { parseMoneyInput } from "@/lib/payment";
import type { CashPosition } from "@/lib/cash";

const moneyText = (value: number) => String(value).replace(".", ",");

function formatDay(day: string) {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

/** "Em caixa": o saldo da conta hoje. Parte do valor que o dono informa e acompanha vendas pagas e despesas. */
export function CashCard({ position, today, committed = 0 }: { position: CashPosition; today: string; committed?: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(!position.configured);
  const [value, setValue] = useState(position.configured ? moneyText(position.opening) : "");
  const [date, setDate] = useState(position.since ?? today);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const negative = value.trim().startsWith("-");
    const amount = parseMoneyInput(value.replace("-", "")) * (negative ? -1 : 1);
    if (value.trim() === "") {
      setError("Informe quanto você tem em conta.");
      return;
    }
    setPending(true);
    const result = await saveCashBalanceAction(amount, date);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setError(null);
    setEditing(false);
    toast("Saldo atualizado");
    router.refresh();
  };

  return (
    <div className="mb-8 border border-petrol/50 p-5">
      <p className="label-caps text-[11px] text-graphite">Em caixa</p>
      {position.configured ? (
        <>
          <p className={`font-display mt-2 text-3xl sm:text-4xl ${position.balance < 0 ? "text-red-500" : "text-petrol"}`}>{formatPrice(position.balance)}</p>
          <p className="mt-1 text-xs text-graphite">
            Saldo de {formatPrice(position.opening)} em {formatDay(position.since!)}, mais as vendas pagas e menos todos os gastos desde então.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs text-graphite">Saldo inicial</dt>
              <dd>{formatPrice(position.opening)}</dd>
            </div>
            <div>
              <dt className="text-xs text-graphite">+ Vendas recebidas</dt>
              <dd className="text-petrol">{formatPrice(position.received)}</dd>
            </div>
            <div>
              <dt className="text-xs text-graphite">− Taxas</dt>
              <dd>{formatPrice(position.fees)}</dd>
            </div>
            <div>
              <dt className="text-xs text-graphite">− Gastos</dt>
              <dd>{formatPrice(position.spent)}</dd>
            </div>
          </dl>
          {committed > 0 && (
            <p className="mt-3 text-xs text-graphite">
              Parcelas e faturas que vencem nos próximos 30 dias: <strong className="text-ink">{formatPrice(committed)}</strong>. Livre depois delas:{" "}
              <strong className={position.balance - committed < 0 ? "text-red-500" : "text-petrol"}>{formatPrice(position.balance - committed)}</strong>.
            </p>
          )}
          {position.toReceive > 0 && (
            <p className="mt-3 text-xs text-graphite">
              Ainda vai entrar: <strong className="text-ink">{formatPrice(position.toReceive)}</strong> de vendas lançadas no painel que não foram pagas.
            </p>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-graphite">
          Informe quanto você tem em conta hoje. A partir daí, tudo que for vendido e marcado como pago entra, e todo gasto lançado sai.
        </p>
      )}

      {editing ? (
        <div className="mt-4 rounded-lg border border-mist p-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-graphite">
              Saldo em conta (R$)
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="mt-1 block w-36 rounded-lg border border-mist bg-transparent px-2.5 py-1.5 text-sm text-ink outline-none focus:border-petrol"
              />
            </label>
            <label className="text-xs text-graphite">
              Nesta data
              <input
                type="date"
                value={date}
                max={today}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1 block rounded-lg border border-mist bg-transparent px-2.5 py-1.5 text-sm text-ink outline-none focus:border-petrol"
              />
            </label>
            <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-petrol px-4 py-1.5 text-sm font-semibold disabled:opacity-60">
              {pending ? "Salvando…" : "Salvar"}
            </button>
            {position.configured && (
              <button type="button" onClick={() => setEditing(false)} disabled={pending} className="text-sm text-graphite hover:text-ink">
                Cancelar
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-graphite">
            Vale o saldo da conta nesse dia. Vendas pagas e gastos a partir dessa data (inclusive) mexem no valor; o que veio antes já está no saldo.
            Para acertar com o extrato depois, é só informar o novo saldo com a data de hoje.
          </p>
          {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
        </div>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="mt-3 text-xs font-medium text-petrol hover:underline">
          Acertar saldo com o extrato
        </button>
      )}
    </div>
  );
}
