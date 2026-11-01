import { InstallmentPayButton } from "@/components/admin/installment-pay-button";
import { formatPrice } from "@/lib/format";
import type { MonthBillRow } from "@/lib/installments";
import { round2 } from "@/lib/money";

function dayLabel(day: string) {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

/**
 * Contas do mês: todas as parcelas e faturas do cartão que vencem no mês escolhido, com a situação de cada uma e o botão para marcar
 * como paga (escolhendo o dia em que pagou). Parcela marcada como paga sai do caixa no dia marcado.
 */
export function MonthBills({ rows, monthName, today, autoPay }: { rows: MonthBillRow[]; monthName: string; today: string; autoPay: boolean }) {
  const total = round2(rows.reduce((sum, r) => sum + r.amount, 0));
  const paid = round2(rows.filter((r) => r.paid).reduce((sum, r) => sum + r.amount, 0));
  const open = round2(total - paid);
  const overdue = rows.filter((r) => r.overdue);

  return (
    <section className="mb-8 border border-mist p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label-caps text-[11px] text-graphite">Contas de {monthName}</p>
        <p className="text-xs text-graphite">Parcelas e faturas do cartão que vencem neste mês</p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-graphite">Nenhuma parcela ou fatura vence neste mês.</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-xs text-graphite">Total do mês</dt>
              <dd className="font-display text-xl">{formatPrice(total)}</dd>
            </div>
            <div>
              <dt className="text-xs text-graphite">Já pago</dt>
              <dd className="font-display text-xl text-petrol">{formatPrice(paid)}</dd>
            </div>
            <div>
              <dt className="text-xs text-graphite">Em aberto</dt>
              <dd className={`font-display text-xl ${open > 0 ? "text-ink" : "text-graphite"}`}>{formatPrice(open)}</dd>
            </div>
          </dl>
          {overdue.length > 0 ? (
            <p className="mt-3 text-xs text-red-500">
              {overdue.length} conta(s) vencida(s) sem pagamento marcado: {formatPrice(round2(overdue.reduce((sum, r) => sum + r.amount, 0)))}. Marque como paga para ela sair do caixa.
            </p>
          ) : null}

          <ul className="mt-4 divide-y divide-mist border-t border-mist text-sm">
            {rows.map((row) => (
              <li key={`${row.expenseId}-${row.number}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                <div className="min-w-0">
                  <p className={`truncate ${row.paid ? "text-graphite" : "text-ink"}`}>
                    {row.description}
                    {row.of > 1 ? ` (${row.number}/${row.of})` : ""}
                  </p>
                  <p className="text-xs text-graphite">
                    Vence {dayLabel(row.day)}
                    {row.cardName ? ` · ${row.cardName}` : ""}
                    {row.paidOn ? ` · paga em ${dayLabel(row.paidOn)}${row.paidOn < row.day ? " (antecipada)" : ""}` : row.paid ? " · paga no vencimento" : row.overdue ? " · vencida" : " · em aberto"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className={`font-medium ${row.paid ? "text-graphite" : row.overdue ? "text-red-500" : ""}`}>{formatPrice(row.amount)}</span>
                  {!row.paid || row.paidOn ? <InstallmentPayButton expenseId={row.expenseId} number={row.number} paid={Boolean(row.paidOn)} today={today} /> : <span className="w-24" />}
                </div>
              </li>
            ))}
          </ul>
          {autoPay ? (
            <p className="mt-3 text-[11px] text-graphite">
              Hoje as parcelas vencidas contam como pagas sozinhas. Para marcar uma por uma, desligue “Parcela vencida conta como paga sozinha” em Configurações › Regras da loja › Finanças.
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
