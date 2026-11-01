import { formatPrice } from "@/lib/format";
import type { MonthRevenue } from "@/lib/finance-stats";

/** Histórico de faturamento mês a mês (pedidos confirmados), do mais recente para o mais antigo, com a barra proporcional ao melhor mês. */
export function MonthlyRevenue({ rows, goal }: { rows: MonthRevenue[]; goal: number }) {
  const max = Math.max(1, ...rows.map((r) => r.revenue));
  const total = rows.reduce((sum, r) => sum + r.revenue, 0);
  const orders = rows.reduce((sum, r) => sum + r.orders, 0);
  const best = rows.reduce<MonthRevenue | null>((acc, r) => (r.revenue > (acc?.revenue ?? 0) ? r : acc), null);

  return (
    <div className="mt-6 border border-mist p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">Faturamento por mês</p>
        <p className="text-xs text-graphite">
          {rows.length > 0 ? (
            <>
              <span className="text-base font-semibold text-ink">{formatPrice(total)}</span> em {orders} pedido(s)
              {best && best.revenue > 0 ? ` · melhor mês: ${best.label} (${formatPrice(best.revenue)})` : ""}
            </>
          ) : (
            "Nenhum pedido confirmado ainda."
          )}
        </p>
      </div>

      {rows.length === 0 ? null : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist text-xs text-graphite">
                <th className="py-2 pr-3 font-medium">Mês</th>
                <th className="w-[34%] py-2 pr-3 font-medium">Faturamento</th>
                <th className="py-2 pr-3 text-right font-medium">Pedidos</th>
                <th className="py-2 pr-3 text-right font-medium">Ticket médio</th>
                <th className="py-2 pr-3 text-right font-medium">Mês anterior</th>
                {goal > 0 ? <th className="py-2 text-right font-medium">Meta ({formatPrice(goal)})</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {rows.map((r) => (
                <tr key={r.key}>
                  <td className="py-2.5 pr-3">
                    <span className="capitalize">{r.label}</span>
                    {r.current ? <span className="ml-2 rounded-full bg-petrol/15 px-2 py-0.5 text-[10px] text-petrol">em andamento</span> : null}
                  </td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2 flex-1 rounded-full bg-mist">
                        <div className="h-2 rounded-full bg-petrol" style={{ width: `${(r.revenue / max) * 100}%` }} />
                      </div>
                      <span className="w-24 text-right font-medium">{formatPrice(r.revenue)}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-right text-graphite">{r.orders}</td>
                  <td className="py-2.5 pr-3 text-right text-graphite">{r.orders > 0 ? formatPrice(r.averageTicket) : "sem pedidos"}</td>
                  <td className={`py-2.5 pr-3 text-right ${r.changePct === null ? "text-graphite" : r.changePct >= 0 ? "text-petrol" : "text-red-500"}`}>
                    {r.changePct === null ? "sem base" : `${r.changePct >= 0 ? "▲" : "▼"} ${Math.abs(r.changePct)}%`}
                  </td>
                  {goal > 0 ? (
                    <td className={`py-2.5 text-right ${r.goalPct !== null && r.goalPct >= 100 ? "text-petrol" : "text-graphite"}`}>{r.goalPct}%</td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-[11px] text-graphite">Pedidos confirmados (pagos), pelo dia em que foram feitos. Pedidos cancelados e ainda não pagos ficam de fora.</p>
    </div>
  );
}
