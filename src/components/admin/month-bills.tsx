import { InstallmentPayButton } from "@/components/admin/installment-pay-button";
import { formatPrice } from "@/lib/format";
import type { BillsOverview, MonthBillRow } from "@/lib/installments";
import { round2 } from "@/lib/money";

const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MAX_NEXT_MONTHS = 6;

function monthName(key: string) {
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} de ${year}`;
}

function dayLabel(day: string) {
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}

const sum = (rows: MonthBillRow[]) => round2(rows.reduce((total, r) => total + r.amount, 0));

function Row({ row, today }: { row: MonthBillRow; today: string }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
      <div className="min-w-0">
        <p className={`truncate ${row.paid ? "text-graphite" : "text-ink"}`}>
          {row.description}
          {row.of > 1 ? ` (${row.number}/${row.of})` : ""}
        </p>
        <p className="text-xs text-graphite">
          Vence {dayLabel(row.day)}
          {row.cardName ? ` · ${row.cardName}` : ""}
          {row.paidOn ? ` · paga em ${dayLabel(row.paidOn)}${row.paidOn < row.day ? " (antecipada)" : ""}` : row.paidBefore ? " · paga (a parcela seguinte já foi paga)" : row.paid ? " · paga no vencimento" : row.overdue ? " · vencida" : " · em aberto"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <span className={`font-medium ${row.paid ? "text-graphite" : row.overdue ? "text-red-500" : ""}`}>{formatPrice(row.amount)}</span>
        {!row.paid || row.paidOn ? <InstallmentPayButton expenseId={row.expenseId} number={row.number} paid={Boolean(row.paidOn)} today={today} /> : <span className="w-24" />}
      </div>
    </li>
  );
}

/**
 * Contas do mês: o que ficou atrasado de antes, tudo o que vence no mês escolhido e o que está em aberto nos meses seguintes, com o botão
 * para marcar cada uma como paga (escolhendo o dia em que pagou). Parcela marcada como paga sai do caixa no dia marcado.
 */
export function MonthBills({ overview, month, today, autoPay }: { overview: BillsOverview; month: string; today: string; autoPay: boolean }) {
  const { before, current, after } = overview;
  const total = sum(current);
  const paid = sum(current.filter((r) => r.paid));
  const open = round2(total - paid);
  const beforeTotal = sum(before);
  const shown = after.slice(0, MAX_NEXT_MONTHS);
  const rest = after.slice(MAX_NEXT_MONTHS);
  const restRows = rest.flatMap((m) => m.rows);
  const nothing = before.length === 0 && current.length === 0 && after.length === 0;

  return (
    <section className="mb-8 border border-mist p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="label-caps text-[11px] text-graphite">Contas de {monthName(month)}</p>
        <p className="text-xs text-graphite">Parcelas e faturas do cartão, pelo vencimento</p>
      </div>

      {nothing ? (
        <p className="mt-3 text-sm text-graphite">Nenhuma parcela ou fatura de cartão por pagar. Compras no cartão aparecem aqui no vencimento.</p>
      ) : (
        <>
          <dl className={`mt-3 grid grid-cols-2 gap-3 text-sm ${before.length > 0 ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
            {before.length > 0 ? (
              <div>
                <dt className="text-xs text-red-500">Atrasadas</dt>
                <dd className="font-display text-xl text-red-500">{formatPrice(beforeTotal)}</dd>
              </div>
            ) : null}
            <div>
              <dt className="text-xs text-graphite">Total do mês</dt>
              <dd className="font-display text-xl">{formatPrice(total)}</dd>
            </div>
            <div>
              <dt className="text-xs text-graphite">Já pago</dt>
              <dd className="font-display text-xl text-petrol">{formatPrice(paid)}</dd>
            </div>
            <div>
              <dt className="text-xs text-graphite">Em aberto no mês</dt>
              <dd className={`font-display text-xl ${open > 0 ? "text-ink" : "text-graphite"}`}>{formatPrice(open)}</dd>
            </div>
          </dl>
          {before.length + current.filter((r) => !r.paid).length > 0 ? (
            <p className="mt-2 text-xs text-graphite">
              Para pagar agora: <strong className="text-ink">{formatPrice(round2(beforeTotal + open))}</strong>
              {before.length > 0 ? ` (${formatPrice(beforeTotal)} atrasado e ${formatPrice(open)} deste mês)` : ""}.
            </p>
          ) : null}

          {before.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-semibold text-red-500">Atrasadas de meses anteriores</p>
              <ul className="mt-1 divide-y divide-mist border-t border-mist text-sm">
                {before.map((row) => (
                  <Row key={`${row.expenseId}-${row.number}`} row={row} today={today} />
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-4">
            <p className="text-sm font-semibold">Vencem em {monthName(month)}</p>
            {current.length === 0 ? (
              <p className="mt-1 text-sm text-graphite">Nada vence neste mês.</p>
            ) : (
              <ul className="mt-1 divide-y divide-mist border-t border-mist text-sm">
                {current.map((row) => (
                  <Row key={`${row.expenseId}-${row.number}`} row={row} today={today} />
                ))}
              </ul>
            )}
          </div>

          {shown.length > 0 ? (
            <div className="mt-5">
              <p className="text-sm font-semibold">Próximos meses (em aberto)</p>
              <div className="mt-1 divide-y divide-mist border-y border-mist">
                {shown.map((m, index) => (
                  <details key={m.month} open={index === 0} className="group py-2">
                    <summary className="flex cursor-pointer items-center justify-between gap-3 text-sm">
                      <span className="capitalize">{monthName(m.month)}</span>
                      <span className="text-graphite">
                        {m.rows.length} conta(s) · <strong className="text-ink">{formatPrice(m.total)}</strong>
                      </span>
                    </summary>
                    <ul className="mt-1 divide-y divide-mist text-sm">
                      {m.rows.map((row) => (
                        <Row key={`${row.expenseId}-${row.number}`} row={row} today={today} />
                      ))}
                    </ul>
                  </details>
                ))}
              </div>
              {rest.length > 0 ? (
                <p className="mt-2 text-xs text-graphite">
                  E mais {restRows.length} parcela(s) até {monthName(rest[rest.length - 1].month)}, somando {formatPrice(sum(restRows))}. Escolha o mês no filtro para ver.
                </p>
              ) : null}
            </div>
          ) : null}

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
