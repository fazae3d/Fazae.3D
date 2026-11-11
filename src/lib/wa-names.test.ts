import { describe, expect, it } from "vitest";
import { detectColumns, prepareImportRows, renderMessage, usableName } from "./wa-cadence";

describe("nomes de contatos importados", () => {
  it("nome só com números não vale como nome", () => {
    expect(usableName("2")).toBe("");
    expect(usableName(" 14 ")).toBe("");
    expect(usableName("Tabacaria Fumaça")).toBe("Tabacaria Fumaça");
    expect(usableName(null)).toBe("");
  });
  it("a mensagem sai sem o nome quando ele é só número", () => {
    expect(renderMessage("Olá {{nome}}! Tudo bem?", { name: "2" })).toBe("Olá! Tudo bem?");
    expect(renderMessage("Olá {{nome}}! Tudo bem?", { name: "Maria Souza" })).toBe("Olá Maria! Tudo bem?");
  });
  it("acha a coluna de nome pelo conteúdo quando o título não é reconhecido e ignora a coluna de número da linha", () => {
    const rows = [
      ["N", "Tabacaria", "Telefone"],
      [1, "Fumaça Natal", "84 99844-7839"],
      [2, "Cachimbo Center", "84 99700-4490"],
      [3, "Tabacaria do Zé", "84 98187-5512"],
    ];
    const cols = detectColumns(rows);
    expect(cols.phoneCol).toBe(2);
    expect(cols.nameCol).toBe(1);
  });
  it("importar com a coluna errada não grava número como nome", () => {
    const rows = [["N", "Telefone"], [1, "84 99844-7839"], [2, "84 99700-4490"]];
    const prepared = prepareImportRows(rows, { nameCol: 0, phoneCol: 1, hasHeader: true });
    expect(prepared.valid.map((r) => r.name)).toEqual(["", ""]);
  });
});

describe("planilha de tabacarias (sem cabeçalho)", () => {
  const rows = [
    ["Narguileste Abel Cabral", "Parnamirim", "Nova Parnamirim", "Av. Abel Cabral, 2118 (Posto Estrela)", "(84) 99844-7839", null],
    ["Revistaria e Tabacaria Ponta Negra", "Natal", "Capim Macio", "Av. Eng. Roberto Freire, 8750", "(84) 3642-1025", null],
    ["Conceito Tabacaria e Revistaria", "Natal", "Capim Macio", "R. Leôncio Etelvino de Medeiros, 2877", "(84) 99700-4490", null],
    ["Mr Blunt's Tabacaria", "Natal", "Ponta Negra", "Av. Praia de Búzios, 9136A", "(84) 99963-5498", "Avaliação no Google diz que fechou"],
  ];
  it("pega o nome do estabelecimento (coluna A) e o telefone (coluna E), sem cabeçalho", () => {
    expect(detectColumns(rows)).toEqual({ phoneCol: 4, nameCol: 0, hasHeader: false });
  });
  it("fixo fica de fora e os nomes vêm completos", () => {
    const prepared = prepareImportRows(rows, { nameCol: 0, phoneCol: 4, hasHeader: false });
    expect(prepared.landlines).toBe(1);
    expect(prepared.valid.map((r) => r.name)).toEqual(["Narguileste Abel Cabral", "Conceito Tabacaria e Revistaria", "Mr Blunt's Tabacaria"]);
  });
  it("{{nome_completo}} usa o nome inteiro e {{nome}} só a primeira palavra", () => {
    expect(renderMessage("Olá, falo com {{nome_completo}}?", { name: "Conceito Tabacaria e Revistaria" })).toBe("Olá, falo com Conceito Tabacaria e Revistaria?");
    expect(renderMessage("Olá {{nome}}!", { name: "Conceito Tabacaria e Revistaria" })).toBe("Olá Conceito!");
    expect(renderMessage("Olá, falo com {{nome_completo}}?", { name: "2" })).toBe("Olá, falo com?");
  });
});
