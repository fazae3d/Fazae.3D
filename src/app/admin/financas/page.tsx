import { getAllOrders } from "@/server/repositories/order-repository";
import { getAllExpenses } from "@/server/repositories/expense-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackExpenses, fallbackOrders } from "@/server/demo-fallback";
import {
  cashFlowByMonth,
  expenseCategoryBreakdown,
  growthGoal,
  investmentPayback,
  simplifiedDRE,
} from "@/lib/finance-stats";
import { formatPrice } from "@/lib/format";
import { ExpenseManager } from "@/components/admin/expense-manager";

function KpiCard({
  label,
  value,
  sublabel,
  tone,
}: {
  label: string;
  value: string;
  sublabel?: string;
  tone?: "positive" | "negative" | "neutral";
}) {
  const valueColor = tone === "positive" ? "text-petrol" : tone === "negative" ? "text-red-500" : "text-paper";
  return (
    <div className="border border-mist p-5">
      <p className="label-caps text-[11px] text-graphite">{label}</p>
      <p className={`font-display mt-2 text-2xl ${valueColor}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-graphite">{sublabel}</p>}
    </div>
  );
}

export default async function AdminFinancePage() {
  const [orders, expenses] = await Promise.all([
    withReadFallback(() => getAllOrders(), fallbackOrders),
    withReadFallback(() => getAllExpenses(), fallbackExpenses),
  ]);

  const dre = simplifiedDRE(orders, expenses);
  const payback = investmentPayback(orders, expenses);
  const goal = growthGoal(orders, 5, 12);
  const cashFlow = cashFlowByMonth(orders, expenses, 6);
  const categoryBreakdown = expenseCategoryBreakdown(expenses);
  const maxCategoryTotal = Math.max(1, ...categoryBreakdown.map((c) => c.total));

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl sm:text-3xl">Finanças</h1>
      <p className="mb-8 text-sm text-graphite">
        Visão de custos, caixa e investimento — separada do dashboard de vendas para não misturar desempenho
        comercial com saúde financeira do negócio.
      </p>

      <p className="label-caps mb-3 text-[11px] text-graphite">DRE simplificado (regime de caixa)</p>
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Receita bruta" value={formatPrice(dre.grossRevenue)} />
        <KpiCard label="Custos diretos" value={formatPrice(dre.cogs)} sublabel="Material + embalagem" />
        <KpiCard label="Despesas operacionais" value={formatPrice(dre.operatingExpenses)} />
        <KpiCard
          label="Lucro operacional"
          value={formatPrice(dre.operatingProfit)}
          sublabel={dre.operatingMarginPct !== null ? `${dre.operatingMarginPct}% de margem` : undefined}
          tone={dre.operatingProfit >= 0 ? "positive" : "negative"}
        />
      </div>

      <p className="label-caps mb-3 text-[11px] text-graphite">Investimento e crescimento</p>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border border-mist p-5">
          <p className="label-caps text-[11px] text-graphite">Payback do investimento</p>
          <p className="font-display mt-2 text-2xl">
            {payback.paybackMonths !== null ? `${payback.paybackMonths} meses` : "—"}
          </p>
          <p className="mt-1 text-xs text-graphite">
            {formatPrice(payback.totalInvested)} investidos em equipamento · lucro médio de{" "}
            {formatPrice(payback.avgMonthlyProfit)}/mês
          </p>
          {payback.recoveredPct !== null && (
            <div className="mt-3">
              <div className="h-1.5 w-full bg-mist">
                <div className="h-1.5 bg-petrol" style={{ width: `${payback.recoveredPct}%` }} />
              </div>
              <p className="mt-1 text-xs text-graphite">{payback.recoveredPct}% do investimento recuperado</p>
            </div>
          )}
        </div>

        <div className="border border-mist p-5">
          <p className="label-caps text-[11px] text-graphite">Meta: 5x em 12 meses</p>
          <p className="font-display mt-2 text-2xl">{formatPrice(goal.targetMonthly)}/mês</p>
          <p className="mt-1 text-xs text-graphite">
            Partindo de {formatPrice(goal.baselineMonthly)}/mês
            {goal.monthsOfData < 3 && " (ainda com pouco histórico — recalcula sozinho conforme os meses passam)"}
          </p>
          <p className="mt-2 text-xs text-graphite">
            Crescimento mensal necessário: <span className="text-petrol">{goal.requiredMonthlyGrowthPct}%</span>
            {goal.currentGrowthPct !== null && (
              <>
                {" "}
                · atual: <span className={goal.currentGrowthPct >= goal.requiredMonthlyGrowthPct ? "text-petrol" : "text-red-500"}>
                  {goal.currentGrowthPct}%
                </span>
              </>
            )}
          </p>
        </div>
      </div>

      <p className="label-caps mb-3 text-[11px] text-graphite">Fluxo de caixa (últimos 6 meses)</p>
      <div className="mb-8 overflow-x-auto border border-mist">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-mist text-left">
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Mês</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Entradas</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Saídas</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Saldo</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {cashFlow.map((month) => (
              <tr key={month.key} className="border-b border-mist last:border-0">
                <td className="px-4 py-2.5 capitalize">{month.label}</td>
                <td className="px-4 py-2.5 text-petrol">{formatPrice(month.inflow)}</td>
                <td className="px-4 py-2.5 text-graphite">{formatPrice(month.outflow)}</td>
                <td className={`px-4 py-2.5 ${month.net >= 0 ? "text-petrol" : "text-red-500"}`}>
                  {formatPrice(month.net)}
                </td>
                <td className={`px-4 py-2.5 font-medium ${month.cumulative >= 0 ? "text-paper" : "text-red-500"}`}>
                  {formatPrice(month.cumulative)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {categoryBreakdown.length > 0 && (
        <div className="mb-8 border border-mist p-5">
          <p className="label-caps mb-4 text-[11px] text-graphite">Gastos por categoria (total)</p>
          <ul className="space-y-3">
            {categoryBreakdown.map((c) => (
              <li key={c.category}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-paper">{c.label}</span>
                  <span className="text-graphite">{formatPrice(c.total)}</span>
                </div>
                <div className="mt-1 h-1 w-full bg-mist">
                  <div className="h-1 bg-sand" style={{ width: `${(c.total / maxCategoryTotal) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ExpenseManager expenses={expenses} />
    </div>
  );
}
