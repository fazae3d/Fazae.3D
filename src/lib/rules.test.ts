import { describe, expect, it } from "vitest";
import { canRestore, describeChange, diffRows, entryTitle, filledFields, rowKey, snapshotRow } from "./audit-format";
import { canRepeat, missingVariables, usedVariables, describeAudience, describeDays, detectColumns, effectiveDailyLimit, hasAudience, isWithinSchedule, isWithinSendWindow, normalizeAudience, normalizeSendDays, normalizeSteps, normalizeWindow, parseCsv, prepareImportRows, relativeFromNow, renderMessage } from "./wa-cadence";
import { formatPhone, isMobilePhone, isOptOutText, nextStatus, normalizePhone, parseUazapiMessage, parseUazapiStatusUpdate, phoneFromJid, slugifyShortcut, withOptOutNotice } from "./whatsapp";
import { analyzeResults, formatDuration } from "./wa-results";
import { cashPosition } from "./cash";
import { applyManualPayment } from "./payment";
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
import { needsFollowUp, quoteSavings, quoteWhatsAppMessage } from "./quote";
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

describe("pagamento em partes (vendas do painel)", () => {
  it("soma o que entrou e só marca pago quando completa", () => {
    expect(applyManualPayment(200, 0, "add", 100)).toEqual({ received: 100, paid: false });
    expect(applyManualPayment(200, 100, "add", 100)).toEqual({ received: 200, paid: true });
  });
  it("não passa do total nem fica negativo", () => {
    expect(applyManualPayment(200, 150, "add", 500)).toEqual({ received: 200, paid: true });
    expect(applyManualPayment(200, 50, "set", -10)).toEqual({ received: 0, paid: false });
  });
  it("corrigir/desfazer define o total recebido", () => {
    expect(applyManualPayment(200, 200, "set", 0)).toEqual({ received: 0, paid: false });
    expect(applyManualPayment(200, 200, "set", 100)).toEqual({ received: 100, paid: false });
  });
  it("evita erro de centavos", () => {
    expect(applyManualPayment(0.3, 0.1, "add", 0.2)).toEqual({ received: 0.3, paid: true });
  });
});

describe("Em caixa", () => {
  const D = "2026-10-10";
  const at = (day: string) => `${day}T15:00:00.000Z`;
  const expense = (day: string, value: number) =>
    ({ id: day, description: "x", category: "material", totalValue: value, purchaseDate: `${day}T00:00:00.000Z`, createdAt: at(day) }) as never;
  const base = { openingBalance: 1000, openingDate: D, payments: [] as { orderId: string; amount: number; paidAt: string }[], expenses: [] as never[] };

  it("sem saldo informado não conta nada", () => {
    const r = cashPosition({ ...base, openingDate: null, orders: [order({ paymentStatus: "approved" })] });
    expect(r.configured).toBe(false);
    expect(r.received).toBe(0);
  });
  it("soma vendas pagas desde a data e tira todos os gastos", () => {
    const r = cashPosition({
      ...base,
      orders: [
        order({ id: "A", createdAt: at("2026-10-12"), paymentStatus: "approved", total: 100 }),
        order({ id: "B", createdAt: at("2026-10-05"), paymentStatus: "approved", total: 500 }), // antes do saldo: já está nele
        order({ id: "C", createdAt: at("2026-10-12"), paymentStatus: "pending", total: 300 }), // site, não pago
      ],
      expenses: [expense("2026-10-11", 40), expense("2026-10-01", 999)],
    });
    expect(r.received).toBe(100);
    expect(r.spent).toBe(40);
    expect(r.balance).toBe(1060);
  });
  it("venda do painel entra no dia em que foi marcada como paga, em parcelas", () => {
    const o = order({ id: "E", channel: "whatsapp", createdAt: at("2026-10-01"), paymentStatus: "pending", depositAmount: 100, total: 200 });
    const r = cashPosition({ ...base, orders: [o], payments: [{ orderId: "E", amount: 100, paidAt: at("2026-10-14") }] });
    expect(r.received).toBe(100);
    expect(r.toReceive).toBe(100);
  });
  it("marcar pago por engano e desfazer não mexe no caixa", () => {
    const o = order({ id: "F", channel: "whatsapp", createdAt: at("2026-10-01"), paymentStatus: "pending", depositAmount: 0, total: 200 });
    const r = cashPosition({ ...base, orders: [o], payments: [{ orderId: "F", amount: -200, paidAt: at("2026-10-15") }] });
    expect(r.received).toBe(0);
  });
  it("desconta a taxa na proporção do que entrou", () => {
    const r = cashPosition({ ...base, orders: [order({ createdAt: at("2026-10-12"), paymentStatus: "approved", total: 100, paymentFee: 5 })] });
    expect(r.fees).toBe(5);
    expect(r.balance).toBe(1095);
  });
  it("cancelado não entra", () => {
    const r = cashPosition({ ...base, orders: [order({ createdAt: at("2026-10-12"), paymentStatus: "approved", status: "Cancelado" })] });
    expect(r.received).toBe(0);
  });
});

describe("WhatsApp: telefone, opt-out e webhooks da uazapi", () => {
  it("normaliza telefones brasileiros", () => {
    expect(normalizePhone("(84) 99999-8888")).toBe("5584999998888");
    expect(normalizePhone("84 3333-4444")).toBe("558433334444");
    expect(normalizePhone("+55 84 99999-8888")).toBe("5584999998888");
    expect(normalizePhone("123")).toBeNull();
    expect(phoneFromJid("5584999998888@s.whatsapp.net")).toBe("5584999998888");
    expect(phoneFromJid("5584999998888:12@s.whatsapp.net")).toBe("5584999998888");
    expect(phoneFromJid("123456@lid")).toBeNull();
    expect(formatPhone("5584999998888")).toBe("(84) 99999-8888");
  });
  it("só entende 'sair' quando é o pedido inteiro", () => {
    expect(isOptOutText("Sair")).toBe(true);
    expect(isOptOutText("  PARE de enviar!! ")).toBe(true);
    expect(isOptOutText("Não quero mais")).toBe(true);
    expect(isOptOutText("preciso sair às 15h, depois falo")).toBe(false);
    expect(isOptOutText("")).toBe(false);
  });
  const incoming = (over: Record<string, unknown> = {}) => ({
    EventType: "messages",
    token: "t",
    message: { messageid: "ABC", chatid: "5584999998888@s.whatsapp.net", senderName: "Maria", fromMe: false, isGroup: false, messageType: "Conversation", text: "Oi, quero um chaveiro", messageTimestamp: 1788868800000, ...over },
  });
  it("lê mensagem recebida", () => {
    const m = parseUazapiMessage(incoming());
    expect(m).toMatchObject({ phone: "5584999998888", name: "Maria", fromMe: false, text: "Oi, quero um chaveiro", providerId: "ABC", mediaType: null });
    expect(m?.at.getTime()).toBe(1788868800000);
  });
  it("detecta mídia e mensagem enviada do celular", () => {
    expect(parseUazapiMessage(incoming({ messageType: "ImageMessage", text: "" }))?.mediaType).toBe("image");
    expect(parseUazapiMessage(incoming({ fromMe: true }))?.fromMe).toBe(true);
  });
  it("ignora grupos, stories, canais e outros eventos", () => {
    expect(parseUazapiMessage(incoming({ isGroup: true }))).toBeNull();
    expect(parseUazapiMessage(incoming({ chatid: "123@g.us" }))).toBeNull();
    expect(parseUazapiMessage(incoming({ chatid: "status@broadcast" }))).toBeNull();
    expect(parseUazapiMessage({ EventType: "connection" })).toBeNull();
    expect(parseUazapiMessage(null)).toBeNull();
  });
  it("usa sender_pn quando o contato vem como @lid", () => {
    expect(parseUazapiMessage(incoming({ chatid: "999@lid", sender_pn: "5584988887777@s.whatsapp.net" }))?.phone).toBe("5584988887777");
  });
  it("lê confirmação de leitura e nunca regride o status", () => {
    expect(parseUazapiStatusUpdate({ EventType: "messages_update", state: "Read", event: { MessageIDs: ["A", "B"] } })).toEqual({ providerIds: ["A", "B"], status: "read" });
    expect(parseUazapiStatusUpdate({ EventType: "messages", state: "Read" })).toBeNull();
    expect(nextStatus("read", "delivered")).toBe("read");
    expect(nextStatus("sent", "delivered")).toBe("delivered");
    expect(nextStatus("sent", "failed")).toBe("sent");
    expect(nextStatus("queued", "failed")).toBe("failed");
  });
});

describe("orçamento por WhatsApp", () => {
  const base = { customerName: "Maria da Silva", number: 12, total: 250, validUntil: "2026-11-30T23:59:59.000Z", link: "https://x.com/orcamento/abc" };
  it("destaca economia e frete grátis", () => {
    const text = quoteWhatsAppMessage({ ...base, savings: 30, freeShipping: true });
    expect(text).toContain("Olá, Maria!");
    expect(text).toContain("economizando");
    expect(text).toContain("frete grátis");
    expect(text.endsWith("https://x.com/orcamento/abc")).toBe(true);
  });
  it("sem vantagem não inventa ganho", () => {
    expect(quoteWhatsAppMessage(base)).not.toMatch(/economizando|frete/);
    expect(quoteWhatsAppMessage({ ...base, freeShipping: true })).toContain("E o frete é grátis");
  });
});

describe("cadências de WhatsApp", () => {
  it("renderiza nome e variações, sem sobra de pontuação", () => {
    expect(renderMessage("Olá {{nome}}! Tudo bem?", { name: "Maria da Silva" })).toBe("Olá Maria! Tudo bem?");
    expect(renderMessage("Olá {{nome}}! Tudo bem?", { name: null })).toBe("Olá! Tudo bem?");
    expect(renderMessage("{{nome}}, vou deixar meu contato.", { name: "" })).toBe("Vou deixar meu contato.");
    expect(renderMessage("{Oi|Olá|E aí} {{nome}}", { name: "Ana" }, () => 0)).toBe("Oi Ana");
    expect(renderMessage("{Oi|Olá|E aí} {{nome}}", { name: "Ana" }, () => 0.99)).toBe("E aí Ana");
  });
  it("valida os passos", () => {
    expect(normalizeSteps([{ delayHours: 0, text: " Oi " }])).toEqual({ ok: true, steps: [{ delayHours: 0, text: "Oi" }] });
    expect(normalizeSteps([]).ok).toBe(false);
    expect(normalizeSteps([{ delayHours: 1, text: "" }]).ok).toBe(false);
    expect(normalizeSteps([{ delayHours: -1, text: "x" }]).ok).toBe(false);
    expect(normalizeSteps(Array.from({ length: 11 }, () => ({ delayHours: 1, text: "x" }))).ok).toBe(false);
  });
  it("só envia de segunda a sábado, dentro do horário da loja (UTC-3)", () => {
    expect(isWithinSendWindow(new Date("2026-10-21T13:00:00Z"), 8, 18)).toBe(true); // quarta 10h
    expect(isWithinSendWindow(new Date("2026-10-21T10:59:00Z"), 8, 18)).toBe(false); // quarta 7h59
    expect(isWithinSendWindow(new Date("2026-10-21T11:00:00Z"), 8, 18)).toBe(true); // quarta 8h
  });
  it("domingo e fora do horário não enviam", () => {
    expect(isWithinSendWindow(new Date("2026-10-25T15:00:00Z"), 8, 18)).toBe(false); // domingo
    expect(isWithinSendWindow(new Date("2026-10-21T22:00:00Z"), 8, 18)).toBe(false); // quarta 19h
    expect(isWithinSendWindow(new Date("2026-10-24T14:00:00Z"), 8, 18)).toBe(true); // sábado 11h
  });
  it("aquece o limite diário aos poucos", () => {
    expect(effectiveDailyLimit(100, null, "2026-10-21")).toBe(20);
    expect(effectiveDailyLimit(100, "2026-10-21", "2026-10-21")).toBe(20);
    expect(effectiveDailyLimit(100, "2026-10-21", "2026-10-23")).toBe(50);
    expect(effectiveDailyLimit(100, "2026-10-01", "2026-10-21")).toBe(100);
    expect(effectiveDailyLimit(30, "2026-10-01", "2026-10-21")).toBe(30);
  });
  it("lê planilha: acha as colunas pelo cabeçalho e limpa os telefones", () => {
    const rows = [
      ["Cliente", "WhatsApp", "Cidade"],
      ["Maria", "(84) 99999-8888", "Natal"],
      ["João", 84988887777, "Parnamirim"],
      ["Duplicada", "84 99999-8888", ""],
      ["Sem fone", "abc", ""],
      ["", "", ""],
    ];
    const cols = detectColumns(rows);
    expect(cols).toEqual({ nameCol: 0, phoneCol: 1, hasHeader: true });
    const prepared = prepareImportRows(rows, cols);
    expect(prepared.valid).toEqual([
      { name: "Maria", phone: "5584999998888" },
      { name: "João", phone: "5584988887777" },
    ]);
    expect(prepared.duplicates).toBe(1);
    expect(prepared.invalid).toHaveLength(1);
  });
  it("sem cabeçalho, descobre a coluna do telefone pelo conteúdo", () => {
    const cols = detectColumns([["Maria", "84999998888"], ["João", "84988887777"]]);
    expect(cols).toEqual({ nameCol: 0, phoneCol: 1, hasHeader: false });
  });
  it("lê CSV com ponto e vírgula e aspas", () => {
    expect(parseCsv('nome;telefone\n"Silva; Maria";84999998888\r\nJoão;84988887777\n')).toEqual([
      ["nome", "telefone"],
      ["Silva; Maria", "84999998888"],
      ["João", "84988887777"],
    ]);
  });
});

describe("tempo relativo da fila", () => {
  const now = new Date("2026-10-22T12:00:00Z");
  it("descreve quanto falta", () => {
    expect(relativeFromNow(null, now)).toBe("Sem horário");
    expect(relativeFromNow("2026-10-22T11:00:00Z", now)).toBe("agora");
    expect(relativeFromNow("2026-10-22T12:25:00Z", now)).toBe("em 25 min");
    expect(relativeFromNow("2026-10-22T15:00:00Z", now)).toBe("em 3 h");
    expect(relativeFromNow("2026-10-24T12:00:00Z", now)).toBe("em 2 dias");
  });
});

describe("regras de envio: agenda, público e repetição", () => {
  const defaults = { windowStartHour: 8, windowEndHour: 18 };
  it("agenda por dia da semana e horário (própria ou geral)", () => {
    const seg = { sendDays: [1, 3, 5], windowStartHour: null, windowEndHour: null };
    expect(isWithinSchedule(new Date("2026-10-21T13:00:00Z"), seg, defaults)).toBe(true); // quarta 10h
    expect(isWithinSchedule(new Date("2026-10-20T13:00:00Z"), seg, defaults)).toBe(false); // terça
    expect(isWithinSchedule(new Date("2026-10-21T13:00:00Z"), { ...seg, windowStartHour: 14, windowEndHour: 16 }, defaults)).toBe(false); // 10h fora de 14 a 16
    expect(isWithinSchedule(new Date("2026-10-25T15:00:00Z"), { sendDays: [0], windowStartHour: null, windowEndHour: null }, defaults)).toBe(true); // domingo liberado
  });
  it("normaliza dias e horário", () => {
    expect(normalizeSendDays([5, 1, 1, 9, "x"])).toEqual([1, 5]);
    expect(normalizeSendDays([])).toEqual([1, 2, 3, 4, 5, 6]);
    expect(normalizeWindow(9, 17)).toEqual({ windowStartHour: 9, windowEndHour: 17 });
    expect(normalizeWindow(17, 9)).toEqual({ windowStartHour: null, windowEndHour: null });
    expect(normalizeWindow(9, null)).toEqual({ windowStartHour: null, windowEndHour: null });
  });
  it("descreve os dias", () => {
    expect(describeDays([1, 2, 3, 4, 5, 6])).toBe("Seg a Sáb");
    expect(describeDays([0, 1, 2, 3, 4, 5, 6])).toBe("Todos os dias");
    expect(describeDays([1, 3, 5])).toBe("Seg, Qua e Sex");
    expect(describeDays([6])).toBe("Sáb");
  });
  it("valida o público e descreve em português", () => {
    const audience = normalizeAudience({ conversations: { sources: ["prospeccao", "lixo"], stages: ["interessado"], tag: " Lista-X ", silentDays: 7 }, inactiveCustomersDays: 120 });
    expect(audience).toEqual({ conversations: { sources: ["prospeccao"], stages: ["interessado"], tag: "lista-x", silentDays: 7 }, inactiveCustomersDays: 120 });
    expect(hasAudience(audience)).toBe(true);
    expect(hasAudience(normalizeAudience({}))).toBe(false);
    expect(normalizeAudience({ inactiveCustomersDays: -3 })).toEqual({});
    const text = describeAudience(audience, { source: (k) => k, stage: (k) => k });
    expect(text).toContain("sem nenhuma mensagem há 7 dias");
    expect(text).toContain("Clientes que não compram há 120 dias");
  });
  it("repete só quem concluiu e já passou o intervalo", () => {
    const now = new Date("2026-10-22T12:00:00Z");
    const done = { status: "concluida", finishedAt: new Date("2026-09-01T12:00:00Z") };
    expect(canRepeat(30, done, now)).toBe(true);
    expect(canRepeat(90, done, now)).toBe(false);
    expect(canRepeat(null, done, now)).toBe(false);
    expect(canRepeat(30, { status: "parada", finishedAt: done.finishedAt }, now)).toBe(false);
    expect(canRepeat(30, { status: "concluida", finishedAt: null }, now)).toBe(false);
  });
});

describe("telefone: nono dígito, fixo e aviso de saída", () => {
  it("unifica celular com e sem o nono dígito", () => {
    expect(normalizePhone("558499998888")).toBe("5584999998888");
    expect(normalizePhone("(84) 9999-8888")).toBe("5584999998888");
    expect(phoneFromJid("558499998888@s.whatsapp.net")).toBe("5584999998888");
    expect(phoneFromJid("5584999998888@s.whatsapp.net")).toBe("5584999998888");
  });
  it("não mexe em telefone fixo e reconhece o que é celular", () => {
    expect(normalizePhone("(84) 3333-4444")).toBe("558433334444");
    expect(isMobilePhone("(84) 3333-4444")).toBe(false);
    expect(isMobilePhone("(84) 99999-8888")).toBe(true);
    expect(isMobilePhone("8499998888")).toBe(true);
    expect(normalizePhone("(00) 99999-8888")).toBeNull();
  });
  it("a chave de comparação ignora DDI e nono dígito", () => {
    expect(phoneKey("558499998888")).toBe(phoneKey("5584999998888"));
    expect(phoneKey("(84) 9999-8888")).toBe(phoneKey("+55 84 99999-8888"));
    expect(phoneKey("84 3333-4444")).not.toBe(phoneKey("84 99999-8888"));
  });
  it("acrescenta o aviso de saída uma única vez", () => {
    expect(withOptOutNotice("Oi!")).toBe("Oi!\n\nSe não quiser receber mais mensagens, responda SAIR.");
    expect(withOptOutNotice("Oi! Responda SAIR para parar.")).toBe("Oi! Responda SAIR para parar.");
  });
  it("atalho da resposta rápida", () => {
    expect(slugifyShortcut("Prazo de entrega!")).toBe("prazo-de-entrega");
    expect(slugifyShortcut("  Endereço / Retirada ")).toBe("endereco-retirada");
  });
  it("importação pula telefones fixos", () => {
    const rows = [["Nome", "Telefone"], ["Ana", "(84) 99999-8888"], ["Loja", "(84) 3333-4444"]];
    const r = prepareImportRows(rows, detectColumns(rows));
    expect(r.valid).toEqual([{ name: "Ana", phone: "5584999998888" }]);
    expect(r.landlines).toBe(1);
  });
});

describe("variáveis nas mensagens", () => {
  const vars = { produto: "Chaveiro Coração", pedido: "FAZ-1" };
  it("preenche as variáveis e some com as vazias", () => {
    expect(renderMessage("Oi {{nome}}, seu {{produto}} ({{pedido}}) chegou?", { name: "Ana Paula" }, () => 0, vars)).toBe("Oi Ana, seu Chaveiro Coração (FAZ-1) chegou?");
    expect(renderMessage("Veja: {{link_orcamento}}", { name: "Ana" }, () => 0, {})).toBe("Veja:");
  });
  it("detecta o que falta para o contato", () => {
    expect(missingVariables("Oi {{nome}}, {{produto}} e {{link_orcamento}}", vars)).toEqual(["link_orcamento"]);
    expect(missingVariables("Oi {{nome}}", {})).toEqual([]);
    expect(usedVariables("{{Nome}} {{produto}} {{produto}}")).toEqual(["nome", "produto"]);
  });
  it("aceita o gatilho de pedido entregue no público", () => {
    const a = normalizeAudience({ deliveredOrdersDays: 3 });
    expect(a).toEqual({ deliveredOrdersDays: 3 });
    expect(hasAudience(a)).toBe(true);
    expect(describeAudience(a, { source: (k) => k, stage: (k) => k })).toBe("Pedido entregue há 3 dias");
  });
});

describe("resultados do WhatsApp", () => {
  const d = (iso: string) => new Date(iso);
  it("calcula funil, origem, cadência e tempo de resposta", () => {
    const conversations = [
      { id: "a", stage: "ganho", source: "prospeccao", lastInboundAt: d("2026-10-02T12:00:00Z"), optedOut: false },
      { id: "b", stage: "novo", source: "prospeccao", lastInboundAt: null, optedOut: false },
      { id: "c", stage: "perdido", source: "entrada", lastInboundAt: d("2026-10-03T12:00:00Z"), optedOut: true },
    ];
    const messages = [
      { conversationId: "a", direction: "out" as const, origin: "cadencia", status: "read", cadenceId: "k1", stepIndex: 0, createdAt: d("2026-10-01T12:00:00Z") },
      { conversationId: "a", direction: "in" as const, origin: "cliente", status: "delivered", cadenceId: null, stepIndex: null, createdAt: d("2026-10-02T12:00:00Z") },
      { conversationId: "a", direction: "out" as const, origin: "manual", status: "sent", cadenceId: null, stepIndex: null, createdAt: d("2026-10-02T12:30:00Z") },
      { conversationId: "b", direction: "out" as const, origin: "cadencia", status: "delivered", cadenceId: "k1", stepIndex: 0, createdAt: d("2026-10-01T12:00:00Z") },
      { conversationId: "b", direction: "out" as const, origin: "cadencia", status: "failed", cadenceId: "k1", stepIndex: 1, createdAt: d("2026-10-02T12:00:00Z") },
    ];
    const r = analyzeResults(conversations, messages, ["novo", "ganho", "perdido"]);
    expect(r.total).toBe(3);
    expect(r.replied).toBe(2);
    expect(r.won).toBe(1);
    expect(r.optedOut).toBe(1);
    expect(r.byStage).toEqual([{ key: "novo", count: 1 }, { key: "ganho", count: 1 }, { key: "perdido", count: 1 }]);
    expect(r.bySource.find((s) => s.key === "prospeccao")).toEqual({ key: "prospeccao", total: 2, replied: 1, won: 1 });
    const k1 = r.byCadence[0];
    expect(k1).toMatchObject({ cadenceId: "k1", sent: 2, delivered: 2, read: 1, replied: 1 }); // a respondeu em 24h, b não; a falha não conta
    expect(r.response.medianMinutes).toBe(30);
    expect(formatDuration(30)).toBe("30 min");
    expect(formatDuration(90)).toBe("1,5 h");
    expect(formatDuration(null)).toBe("Sem dados");
  });
});

describe("auditoria: antes e depois", () => {
  it("compara só o que mudou e ignora campos técnicos", () => {
    const before = { id: "1", name: "Chaveiro", price: 14.99, stock: 3, updatedAt: new Date("2026-10-01T10:00:00Z"), tags: ["a"] };
    const after = { id: "1", name: "Chaveiro", price: 16.5, stock: 3, updatedAt: new Date("2026-10-02T10:00:00Z"), tags: ["a"] };
    expect(diffRows(before, after)).toEqual([{ field: "price", from: 14.99, to: 16.5 }]);
    expect(diffRows(before, before)).toEqual([]);
  });
  it("não guarda segredos e corta textos gigantes", () => {
    const snap = snapshotRow({ email: "a@b.c", passwordHash: "x".repeat(60), resetToken: null, text: "y".repeat(3000) })!;
    expect(snap.passwordHash).toBe("(oculto)");
    expect(snap.resetToken).toBeNull();
    expect(String(snap.text).length).toBeLessThan(1600);
  });
  it("mostra a mudança em português, com dinheiro e porcentagem", () => {
    expect(describeChange({ field: "pixDiscountPct", from: 5, to: 7 })).toBe("Desconto no Pix: 5% → 7%");
    expect(describeChange({ field: "price", from: 14.99, to: 16.5 }).replace(/ /g, " ")).toBe("Preço: R$ 14,99 → R$ 16,50");
    expect(describeChange({ field: "active", from: true, to: false })).toBe("Ativo: Sim → Não");
    expect(describeChange({ field: "notes", from: null, to: "ok" })).toBe("Observações: vazio → ok");
  });
  it("lista os campos preenchidos na criação e na exclusão", () => {
    expect(filledFields({ code: "X", value: 5, notes: null, tags: [] }, "to")).toEqual([
      { field: "code", from: null, to: "X" },
      { field: "value", from: null, to: 5 },
    ]);
    expect(filledFields({ code: "X" }, "from")).toEqual([{ field: "code", from: "X", to: null }]);
  });
  it("identifica o item e dá o título certo", () => {
    expect(rowKey("Product", { slug: "astronauta" })).toBe("astronauta");
    expect(rowKey("Coupon", null, { code: "FAZAE10" })).toBe("FAZAE10");
    expect(entryTitle({ kind: "update", action: "Product.update", targetType: "Product" })).toBe("Alterou produto");
    expect(entryTitle({ kind: "event", action: "pedido.pago", targetType: "Order" })).toBe("Marcou pedido(s) como pago(s)");
  });
  it("só deixa desfazer o que é seguro desfazer, e uma vez", () => {
    expect(canRestore({ kind: "update", targetType: "Coupon" })).toBe(true);
    expect(canRestore({ kind: "update", targetType: "Coupon", restoredAt: new Date() })).toBe(false);
    expect(canRestore({ kind: "delete", targetType: "Product" })).toBe(false);
    expect(canRestore({ kind: "delete", targetType: "Coupon" })).toBe(true);
    expect(canRestore({ kind: "create", targetType: "Coupon" })).toBe(false);
    expect(canRestore({ kind: "update", targetType: "Order" })).toBe(false);
  });
});
