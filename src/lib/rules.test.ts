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
import { computeChannelFee, isMarketplace, parseChannelFees } from "./channels";
import { buildCustomerMetrics, isInactive, phoneKey, rankCustomers, reactivationMessage, wasRecentlyReminded } from "./customer-insights";
import { monthGoalProgress, channelResults } from "./finance-stats";
import { needsFollowUp, quoteSavings } from "./quote";
import { campaignBodyHtml, isSafeButtonUrl } from "./campaign-email";
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

describe("canais, meta e clientes", () => {
  it("taxa do marketplace: comissão sobre o valor + taxa fixa por unidade", () => {
    expect(computeChannelFee({ pct: 14, fixed: 6 }, 100, 2)).toBe(26);
    expect(computeChannelFee(undefined, 100, 2)).toBe(0);
    expect(isMarketplace("shopee")).toBe(true);
    expect(isMarketplace("whatsapp")).toBe(false);
    expect(parseChannelFees({ shopee: { pct: "20", fixed: 4 }, lixo: 1, mercado_livre: { pct: -3, fixed: "x" } })).toEqual({
      shopee: { pct: 20, fixed: 4 },
      mercado_livre: { pct: 0, fixed: 0 },
    });
  });
  it("meta do mês: progresso, falta, por dia e projeção", () => {
    const now = new Date("2026-10-10T12:00:00-03:00");
    const orders = [
      order({ createdAt: "2026-10-03T12:00:00-03:00", total: 300, status: "Pagamento aprovado" }),
      order({ createdAt: "2026-09-30T12:00:00-03:00", total: 999, status: "Pagamento aprovado" }),
      order({ createdAt: "2026-10-05T12:00:00-03:00", total: 500, status: "Cancelado" }),
    ];
    const g = monthGoalProgress(orders, 1000, now);
    expect(g.revenue).toBe(300);
    expect(g.pct).toBe(30);
    expect(g.remaining).toBe(700);
    expect(g.daysLeft).toBe(21);
    expect(g.neededPerDay).toBe(33.33);
    expect(g.projected).toBe(930);
  });
  it("resultado por canal desconta as taxas", () => {
    const rows = channelResults([
      order({ channel: "shopee", total: 100, paymentFee: 20, status: "Entregue" }),
      order({ channel: "shopee", total: 50, paymentFee: 10, status: "Entregue" }),
      order({ channel: "whatsapp", total: 80, status: "Entregue" }),
    ]);
    expect(rows[0]).toMatchObject({ channel: "shopee", count: 2, revenue: 150, fees: 30, net: 120, averageTicket: 75 });
  });
  it("telefones escritos de formas diferentes são o mesmo cliente", () => {
    expect(phoneKey("(84) 99999-8888")).toBe(phoneKey("5584999998888"));
  });
  it("métricas por cliente: ignora cancelado e pagamento pendente do site, casa por telefone ou e-mail", () => {
    const customers = [
      { id: "a", phone: "84999998888", email: "a@x.com" },
      { id: "b", phone: "84988887777", email: undefined },
    ];
    const o = (extra: object) => ({ status: "Entregue" as const, channel: "online" as const, total: 100, createdAt: "2026-01-10T12:00:00Z", customerPhone: undefined as string | undefined, userEmail: undefined as string | undefined, ...extra });
    const m = buildCustomerMetrics(customers, [
      o({ customerPhone: "(84) 99999-8888" }),
      o({ userEmail: "A@x.com", total: 50, createdAt: "2026-03-01T12:00:00Z" }),
      o({ customerPhone: "84999998888", status: "Cancelado", total: 999 }),
      o({ customerPhone: "84999998888", status: "Pedido recebido", total: 999 }),
      o({ customerPhone: "84988887777", channel: "whatsapp", status: "Pedido recebido", total: 200 }),
    ]);
    expect(m.get("a")).toMatchObject({ orderCount: 2, totalSpent: 150, averageTicket: 75, lastOrderAt: "2026-03-01T12:00:00Z" });
    expect(m.get("b")?.orderCount).toBe(1);
    expect(rankCustomers([{ id: "a" }, { id: "b" }], m, "valor").map((c) => c.id)).toEqual(["b", "a"]);
    expect(rankCustomers([{ id: "a" }, { id: "b" }], m, "quantidade").map((c) => c.id)).toEqual(["a", "b"]);
  });
  it("reativação: 120 dias parado, lembrete segura por 30 dias", () => {
    const now = new Date("2026-10-16T12:00:00Z");
    const base = { orderCount: 1, totalSpent: 10, averageTicket: 10 };
    expect(isInactive({ ...base, lastOrderAt: "2026-06-18T12:00:00Z" }, now)).toBe(true);
    expect(isInactive({ ...base, lastOrderAt: "2026-06-20T12:00:00Z" }, now)).toBe(false);
    expect(isInactive({ orderCount: 0, totalSpent: 0, averageTicket: 0 }, now)).toBe(false);
    expect(wasRecentlyReminded("2026-10-01T12:00:00Z", now)).toBe(true);
    expect(wasRecentlyReminded("2026-09-10T12:00:00Z", now)).toBe(false);
    expect(reactivationMessage({ name: "Marina Souza", siteUrl: "https://x.com", coupon: "volta10" })).toContain("cupom VOLTA10");
  });
  it("orçamento sem resposta: acompanhar depois de 3 dias ou perto de vencer", () => {
    const now = new Date("2026-10-16T12:00:00-03:00");
    const q = (sentAt: string, validUntil: string, lastFollowUpAt?: string) => ({ status: "enviado" as const, sentAt, validUntil: validityEndOfDay(validUntil).toISOString(), lastFollowUpAt });
    expect(needsFollowUp(q("2026-10-12T12:00:00-03:00", "2026-10-30"), now)).toBe(true);
    expect(needsFollowUp(q("2026-10-15T12:00:00-03:00", "2026-10-30"), now)).toBe(false);
    expect(needsFollowUp(q("2026-10-15T12:00:00-03:00", "2026-10-17"), now)).toBe(true);
    expect(needsFollowUp(q("2026-10-12T12:00:00-03:00", "2026-10-30", "2026-10-15T12:00:00-03:00"), now)).toBe(false);
    expect(needsFollowUp(q("2026-10-01T12:00:00-03:00", "2026-10-10"), now)).toBe(false);
  });
});

describe("orçamento: sentimento de ganho", () => {
  it("soma desconto e frete grátis na economia", () => {
    const s = quoteSavings({ subtotal: 575.7, discount: 57.57, freeShipping: true, shippingOriginal: 32.5, shipping: 0 });
    expect(s).toMatchObject({ discountPct: 10, shippingSaved: 32.5, total: 90.07, fullPrice: 608.2 });
  });
  it("frete grátis sem valor normal não inventa economia", () => {
    const s = quoteSavings({ subtotal: 100, discount: 0, freeShipping: true, shippingOriginal: 0, shipping: 0 });
    expect(s.total).toBe(0);
    expect(s.freeShipping).toBe(true);
  });
  it("frete cobrado entra no preço cheio e não conta como ganho", () => {
    const s = quoteSavings({ subtotal: 200, discount: 20, freeShipping: false, shippingOriginal: 0, shipping: 25 });
    expect(s).toMatchObject({ total: 20, shippingSaved: 0, fullPrice: 225 });
  });
});

describe("campanhas de e-mail", () => {
  it("texto vira parágrafos e listas, sempre com HTML escapado", () => {
    const html = campaignBodyHtml("Oi <b>você</b>!\nSegunda linha\n\n- um\n- dois\n\nFim");
    expect(html).toContain("&lt;b&gt;");
    expect(html).not.toContain("<b>");
    expect(html).toContain("Oi &lt;b&gt;você&lt;/b&gt;!<br />Segunda linha");
    expect(html).toContain("<ul");
    expect((html.match(/<li/g) ?? []).length).toBe(2);
    expect((html.match(/<p /g) ?? []).length).toBe(2);
  });
  it("botão só aceita http(s)", () => {
    expect(isSafeButtonUrl("https://www.fazae3d.com.br/loja")).toBe(true);
    expect(isSafeButtonUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeButtonUrl("loja")).toBe(false);
    expect(isSafeButtonUrl(undefined)).toBe(false);
  });
});
