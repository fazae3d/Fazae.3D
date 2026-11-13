import { round2 } from "@/lib/money";
import { receivedAmount } from "@/lib/payment";

export type EditLine = { quantity: number; price: number };

/** Totais de um pedido editado: subtotal dos itens, frete e desconto (o total nunca fica negativo). */
export function totalsFor(items: EditLine[], shipping: number, discount: number) {
  const subtotal = round2(items.reduce((sum, item) => sum + item.price * item.quantity, 0));
  const total = round2(Math.max(0, subtotal + shipping - discount));
  return { subtotal, total };
}

export type PaymentAfterEdit = {
  paymentStatus: "approved" | "pending";
  /** Valor já recebido (guardado como sinal). */
  depositAmount: number;
  /** Quanto o cliente ainda deve pagar com o novo total. */
  balanceDue: number;
  /** Quanto o cliente pagou a mais que o novo total (desconto depois de pago): precisa ser devolvido ou virar crédito. */
  overpaid: number;
};

/**
 * O que acontece com o pagamento quando o total do pedido muda (venda lançada no painel):
 * - já recebeu tudo e o total subiu (upsell): vira pagamento parcial, com o que foi pago como sinal e a diferença a receber;
 * - já recebeu tudo e o total desceu (desconto): continua pago e o excedente é avisado;
 * - tinha só um sinal e o novo total é igual ou menor que ele: passa a pago.
 */
export function paymentAfterEdit(current: { total: number; paymentStatus?: string; depositAmount?: number }, newTotal: number): PaymentAfterEdit {
  const received = receivedAmount(current);
  if (received >= newTotal) {
    return { paymentStatus: "approved", depositAmount: received, balanceDue: 0, overpaid: round2(received - newTotal) };
  }
  return { paymentStatus: "pending", depositAmount: received, balanceDue: round2(newTotal - received), overpaid: 0 };
}
