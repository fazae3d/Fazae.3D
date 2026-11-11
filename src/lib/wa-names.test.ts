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
