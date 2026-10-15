import { describe, expect, it } from "vitest";
import { pixPrice, resolveOrderDiscount, round2 } from "./money";
import { computeShippingCost } from "./shipping";
import { getLocalDeliveryRules, isLocalDeliveryCity, localDeliveryCost } from "./local-delivery";
import { matchesSearch, normalizeSearchText } from "./search";
import { isMadeToOrder, isSoldOut } from "./badges";
import { isValidBrPhone } from "./br-format";
import { safeCallbackUrl } from "./safe-redirect";
import { storeDayKey, storeMonthKey } from "./store-time";
import { orderBalanceDue, periodComparison, revenueByDay } from "./admin-stats";
import { toCsv } from "./csv";
import { computeQuoteTotals, daysUntil, isQuoteExpired, quoteDisplayStatus, quoteNumberLabel, validityEndOfDay, validityFromNow } from "./quote";
import type { Product } from "./types";
import type { Order } from "@/server/types";

const product = (over: Partial<Product> = {}) =>
  ({
    slug: "p",
    name: "Chaveiro Coração",
    categoryName: "Chaveiros",
    description: "Peça em PLA",
    tags: ["amor"],
    materials: [{ material: "PLA", colors: ["Preto"] }],
    type: "pronta_entrega",
    stock: 3,
    ...over,
  }) as Product;

const order = (over: Partial<Order> = {}) =>
  ({
    id: "FAZ-X",
    createdAt: new Date().toISOString(),
    channel: "online",
    items: [],
    subtotal: 100,
    shipping: 0,
    discount: 0,
    total: 100,
    paymentMethod: "pix",
    status: "Pagamento aprovado",
    ...over,
  }) as Order;

describe("dinheiro e desconto", () => {
  it("arredonda sem resíduo de ponto flutuante", () => {
    expect(round2(27.980000000000004)).toBe(27.98);
  });
  it("preço no Pix usa o percentual informado", () => {
    expect(pixPrice(14.99, 7.5)).toBe(13.87);
    expect(pixPrice(100, 10)).toBe(90);
  });
  it("Pix e cupom não somam: vale o maior", () => {
    expect(resolveOrderDiscount({ subtotal: 100, couponDiscount: 0, pixPct: 5, isPix: true })).toEqual({ discount: 5, pixWins: true });
    expect(resolveOrderDiscount({ subtotal: 100, couponDiscount: 10, pixPct: 5, isPix: true })).toEqual({ discount: 10, pixWins: false });
    expect(resolveOrderDiscount({ subtotal: 100, couponDiscount: 10, pixPct: 15, isPix: false })).toEqual({ discount: 10, pixWins: false });
  });
});

describe("frete", () => {
  it("frete padrão fica grátis a partir do mínimo; expresso nunca", () => {
    expect(computeShippingCost("padrao", 199.9, 199.9)).toBe(0);
    expect(computeShippingCost("padrao", 199.89, 199.9)).toBeGreaterThan(0);
    expect(computeShippingCost("expressa", 500, 199.9)).toBeGreaterThan(0);
  });
  it("motoboy: grátis acima do mínimo, taxa abaixo", () => {
    const rules = getLocalDeliveryRules({});
    expect(localDeliveryCost(49.9, rules)).toBe(0);
    expect(localDeliveryCost(49.89, rules)).toBe(12);
  });
  it("motoboy só em Natal e Parnamirim (RN)", () => {
    expect(isLocalDeliveryCity("Natal", "RN")).toBe(true);
    expect(isLocalDeliveryCity("parnamirim", "rn")).toBe(true);
    expect(isLocalDeliveryCity("Natal", "SP")).toBe(false);
    expect(isLocalDeliveryCity("Mossoró", "RN")).toBe(false);
  });
});

describe("catálogo", () => {
  it("busca ignora acento e exige todas as palavras", () => {
    expect(normalizeSearchText("Decoração")).toBe("decoracao");
    expect(matchesSearch(product(), "coracao chaveiro")).toBe(true);
    expect(matchesSearch(product(), "chaveiro dragão")).toBe(false);
  });
  it("sob encomenda nunca fica esgotado", () => {
    expect(isMadeToOrder(product({ type: "sob_encomenda", stock: 0 }))).toBe(true);
    expect(isSoldOut(product({ type: "sob_encomenda", stock: 0 }))).toBe(false);
    expect(isSoldOut(product({ stock: 0 }))).toBe(true);
  });
});

describe("validações", () => {
  it("telefone brasileiro", () => {
    expect(isValidBrPhone("(84) 99999-8888")).toBe(true);
    expect(isValidBrPhone("8433334444")).toBe(true);
    expect(isValidBrPhone("84899998888")).toBe(false);
    expect(isValidBrPhone("123")).toBe(false);
  });
  it("redirecionamento só para caminho interno", () => {
    expect(safeCallbackUrl("/loja")).toBe("/loja");
    expect(safeCallbackUrl("//evil.com")).toBe("/conta");
    expect(safeCallbackUrl("https://evil.com")).toBe("/conta");
  });
  it("CSV protege contra fórmula e escapa aspas", () => {
    const csv = toCsv(["a"], [["=1+1"], ['x"y']]);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain('"x""y"');
  });
});

describe("relatórios (fuso de Natal, cancelados fora)", () => {
  it("21h de Natal em 30/09 não vira outubro", () => {
    const d = new Date("2026-10-01T01:00:00Z");
    expect(storeDayKey(d)).toBe("2026-09-30");
    expect(storeMonthKey(d)).toBe("2026-09");
  });
  it("pedido cancelado não entra no faturamento", () => {
    const orders = [order(), order({ status: "Cancelado", total: 500 })];
    expect(revenueByDay(orders, 1)[0].revenue).toBe(100);
    expect(periodComparison(orders, 7).current).toBe(100);
  });
  it("saldo a receber: online pago e cancelado são zero", () => {
    expect(orderBalanceDue(order({ paymentStatus: "approved" }))).toBe(0);
    expect(orderBalanceDue(order({ status: "Cancelado" }))).toBe(0);
    expect(orderBalanceDue(order({ channel: "presencial", depositAmount: 30 }))).toBe(70);
  });
});

describe('orçamentos', () => {
  it('numeração ORC-0007', () => {
    expect(quoteNumberLabel(7)).toBe('ORC-0007');
    expect(quoteNumberLabel(1234)).toBe('ORC-1234');
  });
  it('totais: desconto nunca passa do subtotal e frete negativo vira zero', () => {
    const items = [{ quantity: 3, unitPrice: 9.9 }, { quantity: 1, unitPrice: 50 }];
    expect(computeQuoteTotals(items, 0, 0)).toEqual({ subtotal: 79.7, discount: 0, shipping: 0, total: 79.7 });
    expect(computeQuoteTotals(items, 10, 12.5).total).toBe(82.2);
    expect(computeQuoteTotals(items, 999, 0).total).toBe(0);
    expect(computeQuoteTotals(items, -5, -3)).toMatchObject({ discount: 0, shipping: 0 });
  });
  it('validade vale até o fim do dia (fuso da loja)', () => {
    const valid = validityEndOfDay('2026-10-20').toISOString();
    expect(valid).toBe('2026-10-21T02:59:59.000Z');
    const quote = { status: 'enviado' as const, validUntil: valid };
    expect(isQuoteExpired(quote, new Date('2026-10-20T23:00:00-03:00'))).toBe(false);
    expect(isQuoteExpired(quote, new Date('2026-10-21T00:30:00-03:00'))).toBe(true);
    expect(quoteDisplayStatus(quote, new Date('2026-10-22T12:00:00-03:00'))).toBe('vencido');
    // aprovado/recusado nunca viram "vencido"
    expect(quoteDisplayStatus({ status: 'aprovado', validUntil: valid }, new Date('2027-01-01T00:00:00Z'))).toBe('aprovado');
  });
  it('dias restantes e validade padrão', () => {
    const now = new Date('2026-10-15T12:00:00-03:00');
    expect(validityFromNow(7, now)).toBe('2026-10-22');
    expect(daysUntil(validityEndOfDay('2026-10-18').toISOString(), now)).toBe(3);
    expect(daysUntil(validityEndOfDay('2026-10-14').toISOString(), now)).toBe(-1);
  });
});
