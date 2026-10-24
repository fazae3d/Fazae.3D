import { getAllOrderPayments, getAllOrders } from "@/server/repositories/order-repository";
import { getSettings } from "@/server/repositories/settings-repository";
import { cashPosition } from "@/lib/cash";
import { CashCard } from "@/components/admin/cash-card";
import { getAllExpenses } from "@/server/repositories/expense-repository";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackExpenses, fallbackOrders } from "@/server/demo-fallback";
import {
  cashFlowByMonth,
  channelResults,
  consignmentVisitsAsOrders,
  expenseCategoryBreakdown,
  growthGoal,
  investmentPayback,
  simplifiedDRE,
} from "@/lib/finance-stats";
import { formatPrice } from "@/lib/format";
import { CHANNEL_LABELS } from "@/lib/channels";
import { round2 } from "@/lib/money";
import { storeDayKey, storeMonthKey } from "@/lib/store-time";
import { MonthFilter } from "@/components/admin/month-filter";
import { getAllConsignmentVisits } from "@/server/repositories/consignment-repository";
import { ExpenseManager } from "@/components/admin/expense-manager";
import { upcomingInstallments } from "@/lib/installments";
import { InstallmentPayButton } from "@/components/admin/installment-pay-button";

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
  const valueColor = tone === "positive" ? "text-petrol" : tone === "negative" ? "text-red-500" : "text-ink";
  return (
    <div className="border border-mist p-5">
      <p className="label-caps text-[11px] text-graphite">{label}</p>
      <p className={`font-display mt-2 whitespace-nowrap text-xl sm:text-2xl ${valueColor}`}>{value}</p>
      {sublabel && <p className="mt-1 text-xs text-graphite">{sublabel}</p>}
    </div>
  );
}

const MONTH_NAMES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function monthLabel(key: string) {
  const [year, month] = key.split("-");
  return `${MONTH_NAMES[Number(month) - 1]} de ${year}`;
}

export default async function AdminFinancePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const selectedMonth = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : "";
  const [salesOrders, allExpenses, visits, payments, settings] = await Promise.all([
    withReadFallback(() => getAllOrders(), fallbackOrders),
    withReadFallback(() => getAllExpenses(), fallbackExpenses),
    withReadFallback(() => getAllConsignmentVisits(), []),
    withReadFallback(() => getAllOrderPayments(), []),
    withReadFallback(() => getSettings(), null),
  ]);
  // O dinheiro recebido dos lojistas em consignação também é receita: entra junto com as vendas.
  const allOrders = [...salesOrders, ...consignmentVisitsAsOrders(visits)];

  // Meses disponíveis no filtro: todos os que têm venda ou gasto, mais o mês atual (mais recente primeiro).
  const orderMonth = (o: { createdAt: string }) => storeMonthKey(new Date(o.createdAt));
  // Gastos são datas sem horário (meia-noite UTC): valem pelo calendário, sem deslocar fuso.
  const expenseMonth = (e: { purchaseDate: string }) => new Date(e.purchaseDate).toISOString().slice(0, 7);
  const monthKeys = Array.from(
    new Set([...allOrders.map(orderMonth), ...allExpenses.map(expenseMonth), storeMonthKey(new Date())]),
  ).sort((a, b) => b.localeCompare(a));
  const monthOptions = [
    { value: "", label: "Todos os meses" },
    ...monthKeys.map((key) => ({ value: key, label: monthLabel(key) })),
  ];

  // Com um mês escolhido, o DRE, os gastos e a lista de despesas mostram só aquele mês.
  const orders = selectedMonth ? allOrders.filter((o) => orderMonth(o) === selectedMonth) : allOrders;
  const expenses = selectedMonth ? allExpenses.filter((e) => expenseMonth(e) === selectedMonth) : allExpenses;
  const totalSpent = round2(expenses.reduce((sum, e) => sum + e.totalValue, 0));

  const dre = simplifiedDRE(orders, expenses);
  const channelRows = channelResults(orders);
  // Payback, meta e fluxo de caixa olham o período todo (o fluxo já separa mês a mês).
  const payback = investmentPayback(allOrders, allExpenses);
  const goal = growthGoal(allOrders, settings?.rules.finance.growthMultiplier ?? 5, settings?.rules.finance.growthMonths ?? 12);
  const today = storeDayKey(new Date());
  const cashFlow = cashFlowByMonth(allOrders, allExpenses, 6, today);
  const upcoming = upcomingInstallments(allExpenses, today);
  const upcomingTotal = round2(upcoming.reduce((sum, i) => sum + i.amount, 0));
  const upcomingByMonth = upcoming.reduce((map, i) => map.set(i.day.slice(0, 7), round2((map.get(i.day.slice(0, 7)) ?? 0) + i.amount)), new Map<string, number>());
  const categoryBreakdown = expenseCategoryBreakdown(expenses);
  const maxCategoryTotal = Math.max(1, ...categoryBreakdown.map((c) => c.total));
  const cash = cashPosition({
    openingBalance: settings?.cashBalance ?? 0,
    openingDate: settings?.cashBalanceDate ?? null,
    orders: allOrders,
    payments,
    expenses: allExpenses,
    today,
  });

  return (
    <div>
      <h1 className="font-display mb-2 text-2xl sm:text-3xl">Finanças</h1>
      <p className="mb-8 text-sm text-graphite">
        Visão de custos, caixa e investimento, separada do dashboard de vendas para não misturar desempenho
        comercial com saúde financeira do negócio.
      </p>

      <CashCard position={cash} today={storeDayKey(new Date())} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-mist p-4">
        <MonthFilter value={selectedMonth} options={monthOptions} />
        <p className="text-xs text-graphite">
          {selectedMonth
            ? `Mostrando só ${monthLabel(selectedMonth)}: resultado, gastos e despesas. Payback, meta e fluxo de caixa continuam do período todo.`
            : "Mostrando todos os meses. Escolha um mês para ver o custo e o resultado só dele."}
        </p>
      </div>

      <p className="label-caps mb-3 text-[11px] text-graphite">
        DRE simplificado (regime de caixa){selectedMonth ? `: ${monthLabel(selectedMonth)}` : ""}
      </p>
      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          label="Receita bruta"
          value={formatPrice(dre.grossRevenue)}
          sublabel={[
            dre.shippingIncluded > 0 ? `inclui ${formatPrice(dre.shippingIncluded)} de frete` : null,
            dre.consignmentIncluded > 0 ? `${formatPrice(dre.consignmentIncluded)} de consignação` : null,
          ]
            .filter(Boolean)
            .join(" · ") || undefined}
        />
        <KpiCard
          label="Taxas (pagamento e canais)"
          value={formatPrice(dre.paymentFees)}
          sublabel={
            dre.ordersWithFee > 0
              ? `em ${dre.ordersWithFee} pedido(s): Mercado Pago e marketplaces. Pedidos antigos não têm a taxa registrada`
              : "Aparece a partir dos próximos pedidos aprovados"
          }
        />
        <KpiCard label="Custos diretos" value={formatPrice(dre.cogs)} sublabel="Material + embalagem" />
        <KpiCard label="Despesas operacionais" value={formatPrice(dre.operatingExpenses)} />
        <KpiCard
          label={selectedMonth ? "Gastos do mês (todos)" : "Gastos totais (todos)"}
          value={formatPrice(totalSpent)}
          sublabel="Inclui equipamento, que fica fora do lucro operacional"
        />
        <KpiCard
          label="Lucro operacional"
          value={formatPrice(dre.operatingProfit)}
          sublabel={dre.operatingMarginPct !== null ? `${dre.operatingMarginPct}% de margem` : undefined}
          tone={dre.operatingProfit >= 0 ? "positive" : "negative"}
        />
      </div>

      {channelRows.length > 0 && (
        <>
          <p className="label-caps mb-3 text-[11px] text-graphite">Resultado por canal de venda</p>
          <div className="admin-card mb-8 overflow-x-auto border border-mist">
            <table className="w-full min-w-[560px] text-left text-sm">
              <thead>
                <tr className="border-b border-mist text-xs text-graphite">
                  <th className="px-4 py-3 font-medium">Canal</th>
                  <th className="px-4 py-3 text-right font-medium">Vendas</th>
                  <th className="px-4 py-3 text-right font-medium">Faturamento</th>
                  <th className="px-4 py-3 text-right font-medium">Taxas</th>
                  <th className="px-4 py-3 text-right font-medium">Você recebe</th>
                  <th className="px-4 py-3 text-right font-medium">Ticket médio</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {channelRows.map((row) => (
                  <tr key={row.channel}>
                    <td className="px-4 py-3 font-medium">{CHANNEL_LABELS[row.channel]}</td>
                    <td className="px-4 py-3 text-right">{row.count}</td>
                    <td className="px-4 py-3 text-right">{formatPrice(row.revenue)}</td>
                    <td className="px-4 py-3 text-right text-graphite">{row.fees > 0 ? formatPrice(row.fees) : "Sem taxa"}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatPrice(row.net)}</td>
                    <td className="px-4 py-3 text-right text-graphite">{formatPrice(row.averageTicket)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="label-caps mb-3 text-[11px] text-graphite">Investimento e crescimento</p>
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="border border-mist p-5">
          <p className="label-caps text-[11px] text-graphite">Payback do investimento</p>
          <p className="font-display mt-2 text-2xl">
            {payback.paybackMonths !== null
              ? `${payback.paybackMonths} meses`
              : payback.totalInvested === 0
                ? "Sem investimento"
                : "Sem lucro ainda"}
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
          <p className="label-caps text-[11px] text-graphite">Meta: {settings?.rules.finance.growthMultiplier ?? 5}x em {settings?.rules.finance.growthMonths ?? 12} meses</p>
          <p className="font-display mt-2 text-2xl">{formatPrice(goal.targetMonthly)}/mês</p>
          <p className="mt-1 text-xs text-graphite">
            Partindo de {formatPrice(goal.baselineMonthly)}/mês
            {goal.monthsOfData < 3 && " (ainda com pouco histórico, o cálculo melhora conforme os meses passam)"}
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
                <td className={`px-4 py-2.5 font-medium ${month.cumulative >= 0 ? "text-ink" : "text-red-500"}`}>
                  {formatPrice(month.cumulative)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {upcoming.length > 0 && (
        <div className="mb-8 border border-mist p-5">
          <p className="label-caps text-[11px] text-graphite">Parcelas a pagar</p>
          <p className="font-display mt-2 text-2xl">{formatPrice(upcomingTotal)}</p>
          <p className="mt-1 text-xs text-graphite">
            em {upcoming.length} parcela(s) de compras no cartão. Cada uma sai do caixa e do fluxo no dia do vencimento, sem você precisar marcar nada.
          </p>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {[...upcomingByMonth.entries()].map(([key, value]) => (
              <li key={key} className="flex items-center justify-between border border-mist px-3 py-2">
                <span className="capitalize">{monthLabel(key)}</span>
                <span className="font-medium">{formatPrice(value)}</span>
              </li>
            ))}
          </ul>
          <details className="mt-4 text-xs">
            <summary className="cursor-pointer text-petrol">Ver cada parcela</summary>
            <ul className="mt-2 divide-y divide-mist">
              {upcoming.map((i) => (
                <li key={`${i.expenseId}-${i.number}`} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate">
                    {new Date(`${i.day}T00:00:00.000Z`).toLocaleDateString("pt-BR", { timeZone: "UTC" })} · {i.description} ({i.number}/{i.of})
                  </span>
                  <span className="flex shrink-0 items-center gap-3">
                    {formatPrice(i.amount)}
                    <InstallmentPayButton expenseId={i.expenseId} number={i.number} paid={false} />
                  </span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      )}

      {categoryBreakdown.length > 0 && (
        <div className="mb-8 border border-mist p-5">
          <p className="label-caps mb-4 text-[11px] text-graphite">
            Gastos por categoria ({selectedMonth ? monthLabel(selectedMonth) : "total"})
          </p>
          <ul className="space-y-3">
            {categoryBreakdown.map((c) => (
              <li key={c.category}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink">{c.label}</span>
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

      <ExpenseManager expenses={expenses} today={today} />
    </div>
  );
}
