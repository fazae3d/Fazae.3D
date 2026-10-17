import { round2 } from "@/lib/money";
import { orderBalanceDue } from "@/lib/admin-stats";
import { receivedAmount } from "@/lib/payment";
import { CONSIGNMENT_ID_PREFIX } from "@/lib/finance-stats";
import { storeDayKey } from "@/lib/store-time";
import type { Expense, Order } from "@/server/types";

export type OrderPaymentEvent = { orderId: string; amount: number; paidAt: string };

export type CashPosition = {
  /** O dono já informou o saldo inicial? Sem isso o "Em caixa" não faz sentido. */
  configured: boolean;
  /** Dia (AAAA-MM-DD) a partir do qual vendas e despesas movimentam o caixa. */
  since: string | null;
  opening: number;
  /** Vendas recebidas desde o saldo inicial, antes de descontar taxas. */
  received: number;
  /** Taxas do Mercado Pago e dos marketplaces sobre o que foi recebido. */
  fees: number;
  /** Todas as despesas (qualquer categoria) desde o saldo inicial. */
  spent: number;
  balance: number;
  /** Vendas lançadas no painel que ainda não foram pagas (ou só em parte): dinheiro que vai entrar. */
  toReceive: number;
};

/**
 * "Em caixa" = saldo informado pelo dono + vendas recebidas − taxas − todas as despesas, tudo a partir do dia do saldo.
 * Venda do site conta quando o pagamento é aprovado (dia do pedido); venda lançada no painel conta no dia em que foi marcada como
 * paga (ou em cada parcela). Pedido que já estava pago antes de existir o registro de parcelas conta no dia em que foi lançado.
 * Desfazer um pagamento nunca deixa um pedido contribuir com valor negativo.
 */
export function cashPosition(input: {
  openingBalance: number;
  openingDate: string | null;
  orders: Order[];
  payments: OrderPaymentEvent[];
  expenses: Expense[];
}): CashPosition {
  const { openingBalance, openingDate, orders, payments, expenses } = input;
  const since = openingDate;
  const afterStart = (day: string) => since !== null && day >= since;

  const eventsByOrder = new Map<string, OrderPaymentEvent[]>();
  for (const p of payments) {
    const list = eventsByOrder.get(p.orderId) ?? [];
    list.push(p);
    eventsByOrder.set(p.orderId, list);
  }

  let received = 0;
  let fees = 0;
  let toReceive = 0;
  for (const order of orders) {
    if (order.status === "Cancelado") continue;
    if (!order.id.startsWith(CONSIGNMENT_ID_PREFIX) && order.channel !== "online") toReceive += orderBalanceDue(order);
    if (since === null) continue;

    const createdDay = storeDayKey(new Date(order.createdAt));
    let net = 0;
    if (order.id.startsWith(CONSIGNMENT_ID_PREFIX)) {
      if (afterStart(createdDay)) net = order.total;
    } else if (order.channel === "online") {
      if (afterStart(createdDay)) net = receivedAmount(order);
    } else {
      const events = eventsByOrder.get(order.id) ?? [];
      const eventsTotal = events.reduce((sum, e) => sum + e.amount, 0);
      const legacy = round2(receivedAmount(order) - eventsTotal);
      if (legacy !== 0 && afterStart(createdDay)) net += legacy;
      for (const e of events) if (afterStart(storeDayKey(new Date(e.paidAt)))) net += e.amount;
    }
    net = Math.max(0, round2(net));
    received += net;
    if (net > 0 && order.total > 0) fees += (order.paymentFee ?? 0) * Math.min(1, net / order.total);
  }

  const spent = since === null ? 0 : expenses.filter((e) => afterStart(e.purchaseDate.slice(0, 10))).reduce((sum, e) => sum + e.totalValue, 0);

  return {
    configured: since !== null,
    since,
    opening: round2(openingBalance),
    received: round2(received),
    fees: round2(fees),
    spent: round2(spent),
    balance: round2(openingBalance + received - fees - spent),
    toReceive: round2(toReceive),
  };
}
