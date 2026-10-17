import { round2 } from "@/lib/money";

/** Quanto já entrou de um pedido: pago por inteiro (aprovado) ou o que foi recebido até agora (sinal/parcelas). */
export function receivedAmount(order: { total: number; paymentStatus?: string; depositAmount?: number }) {
  if (order.paymentStatus === "approved") return order.total;
  return round2(Math.min(Math.max(order.depositAmount ?? 0, 0), order.total));
}

/** "1.234,50" / "50,5" / "50.5" → número; vazio ou inválido → 0. */
export function parseMoneyInput(value: string) {
  const text = value.trim();
  if (!text) return 0;
  const n = Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export type ManualPaymentChange = {
  /** Valor recebido no total, depois da alteração (nunca passa do total do pedido nem fica negativo). */
  received: number;
  paid: boolean;
};

/**
 * Pagamento de uma venda lançada no painel (cobrança em partes, como 50% para produzir e 50% na entrega).
 * "add" soma o que acabou de receber ao que já tinha entrado; "set" corrige o total recebido (inclusive para zero: desfazer).
 */
export function applyManualPayment(total: number, currentReceived: number, mode: "add" | "set", amount: number): ManualPaymentChange {
  const raw = mode === "add" ? currentReceived + amount : amount;
  const received = round2(Math.min(Math.max(raw, 0), total));
  return { received, paid: received >= round2(total) };
}
