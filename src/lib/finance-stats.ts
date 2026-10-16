import { round2 } from "@/lib/money";
import { storeMonthKey, toStoreTime } from "@/lib/store-time";
import type { Expense, Order } from "@/server/types";

/** Mês de um pedido (tem horário): no fuso da loja. */
function monthKey(date: Date) {
  return storeMonthKey(date);
}

/** Mês de uma despesa: a data vem de um campo de data (meia-noite UTC), então vale o próprio calendário, sem deslocar fuso. */
function dateOnlyMonthKey(date: Date) {
  return date.toISOString().slice(0, 7);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
}

/** Same "confirmado" rule as revenueSplit in admin-stats.ts: pagamento aprovado (ou etapa posterior), nunca cancelado/pendente. */
export function isConfirmed(order: Order) {
  return order.status !== "Cancelado" && order.status !== "Pedido recebido";
}

/** Prefixo do id dos "pedidos" sintéticos que representam o dinheiro recebido em acertos de consignação. */
export const CONSIGNMENT_ID_PREFIX = "CONSIG-";

/**
 * Cada acerto de consignação com valor recebido vira uma venda (já paga) no dia da visita, para entrar na receita, no caixa e no
 * payback sem mudar nenhuma outra conta. O horário fixo ao meio-dia evita que o fuso empurre a visita para o dia vizinho.
 */
export function consignmentVisitsAsOrders(visits: { id: string; visitDate: string; amountCollected: number }[]): Order[] {
  return visits
    .filter((v) => v.amountCollected > 0)
    .map((v) => ({
      id: `${CONSIGNMENT_ID_PREFIX}${v.id}`,
      createdAt: new Date(new Date(v.visitDate).getTime() + 12 * 60 * 60 * 1000).toISOString(),
      channel: "presencial" as const,
      customerName: "Consignação",
      items: [],
      subtotal: v.amountCollected,
      shipping: 0,
      discount: 0,
      total: v.amountCollected,
      paymentMethod: "pix" as const,
      status: "Entregue" as const,
    }));
}

export type MonthBucket = { key: string; label: string };

function lastNMonths(count: number): MonthBucket[] {
  const nowLocal = toStoreTime(new Date());
  const buckets: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const date = new Date(Date.UTC(nowLocal.getUTCFullYear(), nowLocal.getUTCMonth() - i, 1));
    buckets.push({ key: date.toISOString().slice(0, 7), label: monthLabel(date) });
  }
  return buckets;
}

export type CashFlowMonth = { key: string; label: string; inflow: number; outflow: number; net: number; cumulative: number };

/**
 * Fluxo de caixa real: TODA despesa conta como saída (inclusive equipamento —
 * é dinheiro que saiu de verdade), diferente do DRE, que trata equipamento
 * como investimento e não como despesa operacional.
 */
export function cashFlowByMonth(orders: Order[], expenses: Expense[], months = 6): CashFlowMonth[] {
  const buckets = lastNMonths(months);
  const inflowByMonth = new Map<string, number>();
  const outflowByMonth = new Map<string, number>();

  for (const order of orders) {
    if (!isConfirmed(order)) continue;
    const key = monthKey(new Date(order.createdAt));
    inflowByMonth.set(key, (inflowByMonth.get(key) ?? 0) + order.total);
  }
  for (const expense of expenses) {
    const key = dateOnlyMonthKey(new Date(expense.purchaseDate));
    outflowByMonth.set(key, (outflowByMonth.get(key) ?? 0) + expense.totalValue);
  }

  let cumulative = 0;
  return buckets.map((bucket) => {
    const inflow = round2(inflowByMonth.get(bucket.key) ?? 0);
    const outflow = round2(outflowByMonth.get(bucket.key) ?? 0);
    const net = round2(inflow - outflow);
    cumulative = round2(cumulative + net);
    return { ...bucket, inflow, outflow, net, cumulative };
  });
}

export type SimplifiedDRE = {
  grossRevenue: number;
  /** Parte da receita bruta que é frete cobrado do cliente (não é receita de produto). */
  shippingIncluded: number;
  /** Parte da receita bruta que veio de acertos de consignação. */
  consignmentIncluded: number;
  /** Taxas do Mercado Pago dos pedidos que já têm a taxa registrada (pedidos antigos e vendas manuais não têm). */
  paymentFees: number;
  ordersWithFee: number;
  cogs: number;
  operatingExpenses: number;
  operatingProfit: number;
  operatingMarginPct: number | null;
};

/**
 * DRE simplificado, regime de caixa. Equipamento fica de fora de propósito —
 * é investimento (capex), tratado no payback, não aqui. Sem isso, comprar uma
 * impressora nova faria a margem operacional do mês parecer péssima mesmo
 * com a operação saudável.
 */
export function simplifiedDRE(orders: Order[], expenses: Expense[]): SimplifiedDRE {
  const grossRevenue = round2(orders.filter(isConfirmed).reduce((sum, o) => sum + o.total, 0));
  const cogs = round2(
    expenses.filter((e) => e.category === "material" || e.category === "embalagem").reduce((sum, e) => sum + e.totalValue, 0),
  );
  const operatingExpenses = round2(
    expenses.filter((e) => e.category === "operacional").reduce((sum, e) => sum + e.totalValue, 0),
  );
  const confirmed = orders.filter(isConfirmed);
  const shippingIncluded = round2(confirmed.reduce((sum, o) => sum + (o.shipping ?? 0), 0));
  const consignmentIncluded = round2(confirmed.filter((o) => o.id.startsWith(CONSIGNMENT_ID_PREFIX)).reduce((sum, o) => sum + o.total, 0));
  const withFee = confirmed.filter((o) => o.paymentFee !== undefined);
  const paymentFees = round2(withFee.reduce((sum, o) => sum + (o.paymentFee ?? 0), 0));
  const operatingProfit = round2(grossRevenue - cogs - operatingExpenses - paymentFees);
  const operatingMarginPct = grossRevenue > 0 ? round2((operatingProfit / grossRevenue) * 100) : null;
  return {
    grossRevenue,
    shippingIncluded,
    consignmentIncluded,
    paymentFees,
    ordersWithFee: withFee.length,
    cogs,
    operatingExpenses,
    operatingProfit,
    operatingMarginPct,
  };
}

export type InvestmentPayback = {
  totalInvested: number;
  avgMonthlyProfit: number;
  paybackMonths: number | null;
  recoveredPct: number | null;
};

/** Quantos meses de lucro operacional médio são necessários para "pagar" o total já investido em equipamentos. */
export function investmentPayback(orders: Order[], expenses: Expense[]): InvestmentPayback {
  const totalInvested = round2(
    expenses.filter((e) => e.category === "equipamento").reduce((sum, e) => sum + e.totalValue, 0),
  );

  const dates = [
    ...orders.filter(isConfirmed).map((o) => new Date(o.createdAt)),
    ...expenses.map((e) => new Date(e.purchaseDate)),
  ];
  const { operatingProfit } = simplifiedDRE(orders, expenses);

  if (dates.length === 0) {
    return { totalInvested, avgMonthlyProfit: 0, paybackMonths: null, recoveredPct: totalInvested > 0 ? 0 : null };
  }

  const earliest = new Date(Math.min(...dates.map((d) => d.getTime())));
  const latest = new Date(Math.max(...dates.map((d) => d.getTime())));
  const monthsElapsed = Math.max(
    1,
    (toStoreTime(latest).getUTCFullYear() - toStoreTime(earliest).getUTCFullYear()) * 12 +
      (toStoreTime(latest).getUTCMonth() - toStoreTime(earliest).getUTCMonth()) +
      1,
  );
  const avgMonthlyProfit = round2(operatingProfit / monthsElapsed);

  const paybackMonths = totalInvested > 0 && avgMonthlyProfit > 0 ? round2(totalInvested / avgMonthlyProfit) : null;
  const recoveredPct =
    totalInvested > 0 ? Math.min(100, Math.max(0, round2((operatingProfit / totalInvested) * 100))) : null;

  return { totalInvested, avgMonthlyProfit, paybackMonths, recoveredPct };
}

export type GrowthGoal = {
  baselineMonthly: number;
  targetMonthly: number;
  requiredMonthlyGrowthPct: number;
  currentMonthRevenue: number;
  currentGrowthPct: number | null;
  monthsOfData: number;
};

/**
 * Baseline = receita média dos meses mais antigos disponíveis ("no início").
 * Com pouco histórico (loja nova), início ≈ agora — o indicador só fica mais
 * preciso conforme mais meses de dados reais se acumulam.
 */
export function growthGoal(orders: Order[], multiplier = 5, months = 12): GrowthGoal {
  const monthly = new Map<string, number>();
  for (const order of orders) {
    if (!isConfirmed(order)) continue;
    const key = monthKey(new Date(order.createdAt));
    monthly.set(key, (monthly.get(key) ?? 0) + order.total);
  }
  const sortedKeys = Array.from(monthly.keys()).sort();
  const monthsOfData = sortedKeys.length;

  const baselineKeys = sortedKeys.slice(0, Math.min(3, sortedKeys.length));
  const baselineMonthly =
    baselineKeys.length > 0
      ? round2(baselineKeys.reduce((sum, k) => sum + (monthly.get(k) ?? 0), 0) / baselineKeys.length)
      : 0;

  const targetMonthly = round2(baselineMonthly * multiplier);
  const requiredMonthlyGrowthPct = round2((Math.pow(multiplier, 1 / months) - 1) * 100);

  const currentMonthRevenue = round2(monthly.get(sortedKeys[sortedKeys.length - 1] ?? "") ?? 0);
  const previousMonthRevenue = sortedKeys.length >= 2 ? (monthly.get(sortedKeys[sortedKeys.length - 2]) ?? 0) : null;
  const currentGrowthPct =
    previousMonthRevenue !== null && previousMonthRevenue > 0
      ? round2(((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100)
      : null;

  return { baselineMonthly, targetMonthly, requiredMonthlyGrowthPct, currentMonthRevenue, currentGrowthPct, monthsOfData };
}

export type ExpenseCategoryBreakdown = { category: Expense["category"]; label: string; total: number };

const CATEGORY_LABELS: Record<Expense["category"], string> = {
  equipamento: "Equipamento",
  material: "Material/Insumo",
  embalagem: "Embalagem",
  operacional: "Operacional",
};

export function expenseCategoryBreakdown(expenses: Expense[]): ExpenseCategoryBreakdown[] {
  const totals: Record<Expense["category"], number> = { equipamento: 0, material: 0, embalagem: 0, operacional: 0 };
  for (const expense of expenses) totals[expense.category] += expense.totalValue;
  return (Object.keys(totals) as Expense["category"][])
    .map((category) => ({ category, label: CATEGORY_LABELS[category], total: round2(totals[category]) }))
    .filter((c) => c.total > 0)
    .sort((a, b) => b.total - a.total);
}

export type GoalProgress = {
  goal: number;
  revenue: number;
  pct: number;
  /** Quanto falta para a meta (0 se já bateu). */
  remaining: number;
  daysLeft: number;
  /** Quanto precisa vender por dia nos dias que restam para fechar a meta. */
  neededPerDay: number;
  /** Faturamento no fim do mês se o ritmo até hoje continuar. */
  projected: number;
};

/** Progresso do mês atual (fuso da loja) contra a meta mensal; só vendas confirmadas contam. */
export function monthGoalProgress(orders: Order[], goal: number, now = new Date()): GoalProgress {
  const local = toStoreTime(now);
  const key = local.toISOString().slice(0, 7);
  const dayOfMonth = local.getUTCDate();
  const daysInMonth = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + 1, 0)).getUTCDate();
  const revenue = round2(
    orders.filter((o) => isConfirmed(o) && monthKey(new Date(o.createdAt)) === key).reduce((sum, o) => sum + o.total, 0),
  );
  const daysLeft = daysInMonth - dayOfMonth;
  const remaining = round2(Math.max(0, goal - revenue));
  return {
    goal,
    revenue,
    pct: goal > 0 ? Math.round((revenue / goal) * 100) : 0,
    remaining,
    daysLeft,
    neededPerDay: daysLeft > 0 ? round2(remaining / daysLeft) : remaining,
    projected: round2((revenue / Math.max(1, dayOfMonth)) * daysInMonth),
  };
}

export type ChannelResult = { channel: Order["channel"]; count: number; revenue: number; fees: number; net: number; averageTicket: number };

/** Resultado por canal de venda: faturamento, taxas (gateway ou marketplace) e o que sobra depois delas. */
export function channelResults(orders: Order[]): ChannelResult[] {
  const groups = new Map<Order["channel"], { count: number; revenue: number; fees: number }>();
  for (const order of orders.filter(isConfirmed)) {
    if (order.id.startsWith(CONSIGNMENT_ID_PREFIX)) continue;
    const g = groups.get(order.channel) ?? { count: 0, revenue: 0, fees: 0 };
    g.count += 1;
    g.revenue += order.total;
    g.fees += order.paymentFee ?? 0;
    groups.set(order.channel, g);
  }
  return Array.from(groups.entries())
    .map(([channel, g]) => ({
      channel,
      count: g.count,
      revenue: round2(g.revenue),
      fees: round2(g.fees),
      net: round2(g.revenue - g.fees),
      averageTicket: round2(g.revenue / g.count),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}
