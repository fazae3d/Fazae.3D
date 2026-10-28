import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, validateRulesInput } from "./store-rules";
import { quoteCardTerms } from "./quote";
import { crc16, isValidPixKey, looksLikeBrCode, normalizePixKey, pixKeyFromBrCode, pixPayload, pixText, quotePix } from "./pix";

/** Lê o BR Code de volta em campos (id → valor), para conferir a estrutura. */
function parse(payload: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i < payload.length) {
    const id = payload.slice(i, i + 2);
    const len = Number(payload.slice(i + 2, i + 4));
    out[id] = payload.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

describe("Pix copia e cola", () => {
  it("CRC16 confere com o valor de referência do padrão (CCITT-FALSE)", () => {
    expect(crc16("123456789")).toBe("29B1");
    // Exemplo do manual do Banco Central (Fulano de Tal, Brasília): o CRC publicado é 1D3D.
    expect(crc16("00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-4266554400005204000053039865802BR5913Fulano de Tal6008BRASILIA62070503***6304")).toBe("1D3D");
  });

  it("monta o código com chave, nome, cidade, valor e CRC válido", () => {
    const payload = pixPayload({ key: "123e4567-e12b-12d1-a456-426655440000", name: "Fazaê 3D", city: "Parnamirim", amount: 250, txid: "ORC-0007" });
    const f = parse(payload);
    expect(f["00"]).toBe("01");
    expect(parse(f["26"])["00"]).toBe("BR.GOV.BCB.PIX");
    expect(parse(f["26"])["01"]).toBe("123e4567-e12b-12d1-a456-426655440000");
    expect(f["52"]).toBe("0000");
    expect(f["53"]).toBe("986");
    expect(f["54"]).toBe("250.00");
    expect(f["58"]).toBe("BR");
    expect(f["59"]).toBe("FAZAE 3D");
    expect(f["60"]).toBe("PARNAMIRIM");
    expect(parse(f["62"])["05"]).toBe("ORC0007");
    // o CRC cobre tudo até o "6304"
    expect(payload.slice(-4)).toBe(crc16(payload.slice(0, -4)));
    expect(payload.slice(-8, -4)).toMatch(/^6304$/);
  });

  it("sem valor, o campo de valor não aparece", () => {
    const f = parse(pixPayload({ key: "+5584999998888", name: "Loja", city: "Natal" }));
    expect(f["54"]).toBeUndefined();
    expect(f["62"]).toBeDefined();
  });

  it("nome e cidade saem sem acento, em maiúsculas e dentro do limite", () => {
    expect(pixText("Fazaê 3D – Impressão Ltda. de Natal", 25)).toBe("FAZAE 3D IMPRESSAO LTDA D");
    expect(pixText("São Gonçalo do Amarante", 15)).toBe("SAO GONCALO DO");
  });

  it("valor com centavos vai com 2 casas e ponto", () => {
    expect(parse(pixPayload({ key: "a@b.com", name: "X", city: "Y", amount: 1234.5 }))["54"]).toBe("1234.50");
  });
});

describe("chave Pix", () => {
  it("normaliza CPF, CNPJ e telefone digitados com pontuação", () => {
    expect(normalizePixKey("123.456.789-09")).toBe("12345678909");
    expect(normalizePixKey("12.345.678/0001-90")).toBe("12345678000190");
    expect(normalizePixKey("+55 (84) 99999-8888")).toBe("+5584999998888");
    expect(normalizePixKey("(84) 99999-8888")).toBe("+5584999998888");
    expect(normalizePixKey("  Loja@Email.com ")).toBe("loja@email.com");
  });

  it("aceita só os formatos que o banco aceita", () => {
    for (const ok of ["12345678909", "12345678000190", "+5584999998888", "loja@email.com", "123e4567-e12b-12d1-a456-426655440000"]) expect(isValidPixKey(ok)).toBe(true);
    for (const bad of ["", "12345", "84999998888x", "sem arroba", "5584999998888"]) expect(isValidPixKey(bad)).toBe(false);
  });

  it("colar o copia e cola no lugar da chave: usa a chave de dentro, ou explica que precisa da chave", () => {
    const comChave = pixPayload({ key: "123e4567-e12b-12d1-a456-426655440000", name: "Loja", city: "Natal" });
    expect(looksLikeBrCode(comChave)).toBe(true);
    expect(pixKeyFromBrCode(comChave)).toBe("123e4567-e12b-12d1-a456-426655440000");
    // QR de loja do Mercado Pago: traz um endereço (campo 25) e nenhuma chave
    const semChave = "0002010102112645" + "0014BR.GOV.BCB.PIX" + "2523pixqr.example.com/ol/v2/AB" + "5204000053039865802BR5904Loja6004Natal62070503***6304ABCD";
    expect(pixKeyFromBrCode(semChave)).toBeNull();
    const input = (key: string) => ({ ...JSON.parse(JSON.stringify(DEFAULT_RULES)), pix: { key, depositPct: 50 } });
    const ok = validateRulesInput(input(comChave));
    expect(ok.ok && ok.rules.pix.key).toBe("123e4567-e12b-12d1-a456-426655440000");
    const bad = validateRulesInput(input(semChave));
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.error).toContain("Minhas chaves");
  });

  it("nas Regras da loja: vazio é permitido, formato errado é recusado, pontuação é limpa", () => {
    const input = (key: string, pct = 50) => ({ ...JSON.parse(JSON.stringify(DEFAULT_RULES)), pix: { key, depositPct: pct } });
    expect(validateRulesInput(input("")).ok).toBe(true);
    expect(validateRulesInput(input("12345")).ok).toBe(false);
    expect(validateRulesInput(input("50", 120)).ok).toBe(false);
    const clean = validateRulesInput(input("123.456.789-09"));
    expect(clean.ok && clean.rules.pix.key).toBe("12345678909");
  });
});

describe("Pix do orçamento", () => {
  const rules = (key: string, depositPct: number) => ({ pix: { key, depositPct }, company: { legalName: "Fazaê 3D", city: "Parnamirim" } });
  const quote = { number: 7, total: 301.5 };

  it("sem chave não há Pix", () => {
    expect(quotePix(quote, rules("", 50))).toBeNull();
    expect(quotePix(quote, rules("chave invalida", 50))).toBeNull();
    expect(quotePix({ number: 1, total: 0 }, rules("12345678909", 50))).toBeNull();
  });

  it("sinal de 50%: o QR já vem com o valor do sinal e mostra o que resta", () => {
    const p = quotePix(quote, rules("12345678909", 50))!;
    expect(p.amount).toBe(150.75);
    expect(p.remaining).toBe(150.75);
    expect(parse(p.payload)["54"]).toBe("150.75");
    expect(parse(parse(p.payload)["62"])["05"]).toBe("ORC0007");
  });

  it("a porcentagem escolhida no orçamento vale mais que a das Regras da loja", () => {
    const p = quotePix({ ...quote, pixDepositPct: 100 }, rules("12345678909", 50))!;
    expect(p.amount).toBe(301.5);
    expect(p.pct).toBe(100);
    const sem = quotePix({ ...quote, pixDepositPct: 0 }, rules("12345678909", 50))!;
    expect(sem.amount).toBe(0);
    expect(quotePix({ ...quote, pixDepositPct: undefined }, rules("12345678909", 50))!.amount).toBe(150.75);
  });

  it("orçamento no cartão não leva QR do Pix", () => {
    expect(quotePix({ ...quote, paymentMethod: "cartao" }, rules("12345678909", 50))).toBeNull();
    expect(quotePix({ ...quote, paymentMethod: "pix" }, rules("12345678909", 50))).not.toBeNull();
  });

  it("100% cobra o total; 0% manda o QR sem valor", () => {
    const full = quotePix(quote, rules("12345678909", 100))!;
    expect(full.amount).toBe(301.5);
    expect(full.remaining).toBe(0);
    const free = quotePix(quote, rules("12345678909", 0))!;
    expect(free.amount).toBe(0);
    expect(parse(free.payload)["54"]).toBeUndefined();
  });
});

describe("cartão no orçamento", () => {
  const base = { total: 300 };

  it("só existe quando o pagamento é no cartão", () => {
    expect(quoteCardTerms({ ...base, paymentMethod: "pix" })).toBeNull();
    expect(quoteCardTerms({ ...base })).toBeNull();
  });

  it("acréscimo em branco é isento: o total no cartão é o do orçamento", () => {
    expect(quoteCardTerms({ ...base, paymentMethod: "cartao" })).toEqual({ surcharge: 0, total: 300, installments: 1, perInstallment: 300 });
    expect(quoteCardTerms({ ...base, paymentMethod: "cartao", cardInstallments: 3 })).toEqual({ surcharge: 0, total: 300, installments: 3, perInstallment: 100 });
  });

  it("com acréscimo soma ao total e divide nas parcelas", () => {
    expect(quoteCardTerms({ ...base, paymentMethod: "cartao", cardSurcharge: 21, cardInstallments: 3 })).toEqual({ surcharge: 21, total: 321, installments: 3, perInstallment: 107 });
  });
});
