import { describe, expect, it } from "vitest";
import { paymentAfterEdit, totalsFor } from "./order-edit";

describe("edição de pedido: totais", () => {
  it("soma os itens, o frete e tira o desconto", () => {
    expect(totalsFor([{ quantity: 2, price: 20 }, { quantity: 1, price: 25 }], 10, 5)).toEqual({ subtotal: 65, total: 70 });
  });
  it("o total nunca fica negativo", () => {
    expect(totalsFor([{ quantity: 1, price: 10 }], 0, 50).total).toBe(0);
  });
});

describe("edição de pedido: pagamento", () => {
  it("pedido pago por inteiro que recebe um item a mais vira parcial, com a diferença a receber", () => {
    const r = paymentAfterEdit({ total: 65, paymentStatus: "approved", depositAmount: 65 }, 90);
    expect(r).toEqual({ paymentStatus: "pending", depositAmount: 65, balanceDue: 25, overpaid: 0 });
  });
  it("desconto depois de pago continua pago e avisa o excedente", () => {
    const r = paymentAfterEdit({ total: 65, paymentStatus: "approved", depositAmount: 65 }, 55);
    expect(r).toEqual({ paymentStatus: "approved", depositAmount: 65, balanceDue: 0, overpaid: 10 });
  });
  it("sinal de 30 num pedido que sobe de 100 para 120 continua com saldo a receber", () => {
    const r = paymentAfterEdit({ total: 100, paymentStatus: "pending", depositAmount: 30 }, 120);
    expect(r).toEqual({ paymentStatus: "pending", depositAmount: 30, balanceDue: 90, overpaid: 0 });
  });
  it("sinal que cobre o novo total depois do desconto passa a pago", () => {
    const r = paymentAfterEdit({ total: 100, paymentStatus: "pending", depositAmount: 50 }, 50);
    expect(r.paymentStatus).toBe("approved");
    expect(r.balanceDue).toBe(0);
  });
});
