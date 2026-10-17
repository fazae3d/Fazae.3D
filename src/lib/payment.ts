import { round2 } from "@/lib/money";

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
