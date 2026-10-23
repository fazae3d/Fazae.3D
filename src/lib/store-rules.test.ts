import { describe, expect, it } from "vitest";
import { diffRows, describeChange, fieldLabel } from "./audit-format";
import { getLocalDeliveryRules, isLocalDeliveryCity } from "./local-delivery";
import { computeShippingCost, getShippingOptions } from "./shipping";
import {
  DEFAULT_RULES,
  RULE_FIELDS,
  companyAddress,
  companyIdentificationLine,
  getPath,
  joinNames,
  parseStoreRules,
  publicRules,
  validateRulesInput,
} from "./store-rules";

/** O formulário manda tudo aninhado: monta isso a partir das regras atuais, trocando só o que o teste quer mudar. */
function input(overrides: Record<string, unknown> = {}) {
  const base = JSON.parse(JSON.stringify(DEFAULT_RULES)) as Record<string, unknown>;
  for (const [path, value] of Object.entries(overrides)) {
    const keys = path.split(".");
    let cursor = base;
    for (const key of keys.slice(0, -1)) cursor = cursor[key] as Record<string, unknown>;
    cursor[keys[keys.length - 1]] = value;
  }
  return base;
}

describe("regras da loja: padrões", () => {
  it("repetem o que a loja usava antes de virar editável", () => {
    expect(DEFAULT_RULES.shipping).toEqual({ standardCost: 24.9, standardEta: "5 a 8 dias úteis", expressCost: 39.9, expressEta: "2 a 3 dias úteis" });
    expect(DEFAULT_RULES.storefront).toEqual({ lowStockThreshold: 5, scarcityThreshold: 2, returnDays: 7 });
    expect(DEFAULT_RULES.automation).toEqual({ abandonedCartHours: 2, abandonedCartSecondDays: 3, pendingOrderExpireDays: 4, reactivationDays: 120, reminderCooldownDays: 30 });
    expect(DEFAULT_RULES.reviews).toEqual({ rewardValue: 5, rewardMinSubtotal: 30 });
    expect(DEFAULT_RULES.payments.installments).toBe(3);
    expect(DEFAULT_RULES.payments.welcomeCouponCode).toBe("FAZAE10");
    expect(DEFAULT_RULES.quote.validityDays).toBe(7);
  });

  it("todo campo do formulário aponta para uma regra existente e passa na própria validação", () => {
    const result = validateRulesInput(DEFAULT_RULES);
    expect(result.ok).toBe(true);
    for (const spec of RULE_FIELDS) expect(getPath(DEFAULT_RULES, spec.path)).not.toBeUndefined();
  });

  it("sem nada salvo, a loja usa os padrões (e valor estragado também volta ao padrão)", () => {
    expect(parseStoreRules(null)).toEqual(DEFAULT_RULES);
    expect(parseStoreRules({})).toEqual(DEFAULT_RULES);
    const broken = parseStoreRules({ shipping: { standardCost: "abc", expressCost: -5 }, storefront: { returnDays: 3 } });
    expect(broken.shipping.standardCost).toBe(24.9);
    expect(broken.shipping.expressCost).toBe(39.9);
    expect(broken.storefront.returnDays).toBe(7);
  });

  it("um valor salvo vale e o resto segue no padrão", () => {
    const rules = parseStoreRules({ shipping: { standardCost: 19.9 }, automation: { reactivationDays: 90 } });
    expect(rules.shipping.standardCost).toBe(19.9);
    expect(rules.shipping.expressCost).toBe(39.9);
    expect(rules.automation.reactivationDays).toBe(90);
  });
});

describe("regras da loja: validação", () => {
  it("aceita valores novos e arredonda dinheiro em centavos", () => {
    const result = validateRulesInput(input({ "shipping.standardCost": "19.999", "storefront.lowStockThreshold": "8" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rules.shipping.standardCost).toBe(20);
      expect(result.rules.storefront.lowStockThreshold).toBe(8);
    }
  });

  it("recusa números fora do limite, fracionados onde só cabe inteiro e textos vazios obrigatórios", () => {
    expect(validateRulesInput(input({ "payments.installments": 20 })).ok).toBe(false);
    expect(validateRulesInput(input({ "automation.abandonedCartHours": 1.5 })).ok).toBe(false);
    expect(validateRulesInput(input({ "storefront.returnDays": 5 })).ok).toBe(false);
    expect(validateRulesInput(input({ "company.legalName": "  " })).ok).toBe(false);
    expect(validateRulesInput(input({ "company.zip": "123" })).ok).toBe(false);
    expect(validateRulesInput(input({ "owner.email": "sem-arroba" })).ok).toBe(false);
    expect(validateRulesInput(input({ "company.instagramUrl": "instagram.com/fazae" })).ok).toBe(false);
  });

  it("campos opcionais podem ficar vazios", () => {
    const result = validateRulesInput(input({ "company.cnpj": "", "owner.email": "", "company.pixNotice": "", "payments.welcomeCouponCode": "" }));
    expect(result.ok).toBe(true);
  });

  it("recusa combinações que não fazem sentido", () => {
    const expressMenor = validateRulesInput(input({ "shipping.expressCost": 10 }));
    expect(expressMenor.ok).toBe(false);
    const selo = validateRulesInput(input({ "storefront.scarcityThreshold": 9, "storefront.lowStockThreshold": 5 }));
    expect(selo.ok).toBe(false);
  });

  it("lista de cidades: uma por linha, sem repetir e sem vazios; sigla do estado vira maiúscula", () => {
    const result = validateRulesInput(input({ "localDelivery.cities": "Natal\n\n  Parnamirim \nNatal\nMacaíba", "localDelivery.state": "rn" }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.rules.localDelivery.cities).toEqual(["Natal", "Parnamirim", "Macaíba"]);
      expect(result.rules.localDelivery.state).toBe("RN");
    }
  });

  it("o e-mail do dono não vai para o navegador", () => {
    const pub = publicRules({ ...DEFAULT_RULES, owner: { email: "dono@loja.com" } });
    expect(JSON.stringify(pub)).not.toContain("dono@loja.com");
  });
});

describe("regras da loja: onde aparecem", () => {
  it("endereço e identificação sem travessão", () => {
    expect(companyAddress(DEFAULT_RULES.company)).toBe("Rua Luís Nogueira Filho, 419, Nova Esperança, Parnamirim/RN");
    const line = companyIdentificationLine(DEFAULT_RULES.company);
    expect(line).toContain("CEP 59144-336");
    expect(line).not.toContain(" - ");
    expect(line).not.toContain("CNPJ");
    expect(companyIdentificationLine({ ...DEFAULT_RULES.company, cnpj: "12.345.678/0001-90" })).toContain("CNPJ 12.345.678/0001-90");
  });

  it("junta nomes de cidades como numa frase", () => {
    expect(joinNames(["Natal"])).toBe("Natal");
    expect(joinNames(["Natal", "Parnamirim"])).toBe("Natal e Parnamirim");
    expect(joinNames(["Natal", "Parnamirim", "Macaíba"])).toBe("Natal, Parnamirim e Macaíba");
  });

  it("entrega própria usa cidades e prazo das regras", () => {
    const padrao = getLocalDeliveryRules({});
    expect(padrao.label).toBe("Entrega em Natal e Parnamirim");
    expect(padrao.eta).toBe("Entrega em até 48h");
    expect(padrao.citiesLabel).toBe("Natal e Parnamirim");

    const nova = getLocalDeliveryRules({ rules: { localDelivery: { cities: ["Natal", "Macaíba"], state: "RN", etaText: "Entrega no mesmo dia" } } });
    expect(nova.label).toBe("Entrega em Natal e Macaíba");
    expect(isLocalDeliveryCity("Macaíba", "RN", nova)).toBe(true);
    expect(isLocalDeliveryCity("Parnamirim", "RN", nova)).toBe(false);
    expect(isLocalDeliveryCity("Macaíba", "PB", nova)).toBe(false);
  });

  it("frete fixo usa valores e prazos das regras; padrão continua o mesmo", () => {
    expect(computeShippingCost("padrao", 10, 199.9)).toBe(24.9);
    expect(computeShippingCost("expressa", 10, 199.9)).toBe(39.9);
    const rules = { shipping: { standardCost: 15, standardEta: "3 dias", expressCost: 30, expressEta: "1 dia" } };
    expect(computeShippingCost("padrao", 10, 199.9, rules)).toBe(15);
    expect(computeShippingCost("padrao", 200, 199.9, rules)).toBe(0);
    expect(computeShippingCost("expressa", 500, 199.9, rules)).toBe(30);
    expect(getShippingOptions(rules).map((o) => o.eta)).toEqual(["3 dias", "1 dia"]);
  });
});

describe("regras da loja: auditoria", () => {
  const base = { id: 1, freeShippingThreshold: 299.9, rules: null };

  it("primeira vez que as regras são salvas: só aparece o que difere do padrão", () => {
    const next = parseStoreRules({ shipping: { standardCost: 19.9 } });
    const changes = diffRows(base, { ...base, rules: next });
    expect(changes).toEqual([{ field: "rules.shipping.standardCost", from: 24.9, to: 19.9 }]);
  });

  it("cada regra mudada vira uma linha legível, e as que não mudaram não aparecem", () => {
    const before = parseStoreRules({ shipping: { standardCost: 19.9 } });
    const after = parseStoreRules({ shipping: { standardCost: 22.5 }, automation: { reactivationDays: 90 } });
    const changes = diffRows({ ...base, rules: before }, { ...base, rules: after });
    expect(changes.map((c) => c.field).sort()).toEqual(["rules.automation.reactivationDays", "rules.shipping.standardCost"]);
    const texts = changes.map(describeChange).sort();
    expect(texts[0]).toContain("Regras da loja");
    expect(texts.join(" | ")).toContain("R$");
    expect(texts.join(" | ")).toContain("120 dias → 90 dias");
  });

  it("salvar sem mexer em nada não gera registro", () => {
    const rules = parseStoreRules({ shipping: { standardCost: 19.9 } });
    expect(diffRows({ ...base, rules }, { ...base, rules: JSON.parse(JSON.stringify(rules)) })).toEqual([]);
    expect(diffRows(base, { ...base })).toEqual([]);
  });

  it("mudanças fora das regras continuam normais", () => {
    const changes = diffRows(base, { ...base, freeShippingThreshold: 250 });
    expect(changes).toEqual([{ field: "freeShippingThreshold", from: 299.9, to: 250 }]);
  });

  it("rótulo das regras vem do nome do campo no painel", () => {
    expect(fieldLabel("rules.shipping.standardCost")).toBe("Regras da loja: Frete padrão: valor");
  });
});
