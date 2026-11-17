import { describe, expect, it } from "vitest";
import { addBusinessDays, deadlineStatus } from "./business-days";

// 2026-11-16 é segunda-feira. O horário 15:00Z = 12:00 em Natal (mesmo dia).
const monday = new Date("2026-11-16T15:00:00.000Z");

describe("dias úteis", () => {
  it("10 dias úteis a partir de uma segunda caem na segunda de duas semanas depois", () => {
    expect(addBusinessDays(monday, 10).toISOString()).toBe("2026-11-30T00:00:00.000Z");
  });
  it("sexta mais 1 dia útil é segunda, e fim de semana não conta", () => {
    expect(addBusinessDays(new Date("2026-11-20T15:00:00.000Z"), 1).toISOString()).toBe("2026-11-23T00:00:00.000Z");
    expect(addBusinessDays(new Date("2026-11-21T15:00:00.000Z"), 1).toISOString()).toBe("2026-11-23T00:00:00.000Z");
  });
  it("venda às 22h em Natal (01h UTC do dia seguinte) conta no dia local", () => {
    // 2026-11-16 22:00 em Natal = 2026-11-17T01:00Z, ainda segunda para a loja.
    expect(addBusinessDays(new Date("2026-11-17T01:00:00.000Z"), 1).toISOString()).toBe("2026-11-17T00:00:00.000Z");
  });
});

describe("situação do prazo", () => {
  const deadline = "2026-11-30T00:00:00.000Z"; // segunda
  it("no 7º dia útil (faltam 3) já avisa; antes disso está tranquilo", () => {
    expect(deadlineStatus(deadline, new Date("2026-11-24T15:00:00.000Z"), 3)).toEqual({ level: "ok", remaining: 4 });
    expect(deadlineStatus(deadline, new Date("2026-11-25T15:00:00.000Z"), 3)).toEqual({ level: "alerta", remaining: 3 });
    expect(deadlineStatus(deadline, new Date("2026-11-30T15:00:00.000Z"), 3)).toEqual({ level: "alerta", remaining: 0 });
  });
  it("passou do dia do prazo = atrasado", () => {
    expect(deadlineStatus(deadline, new Date("2026-12-01T15:00:00.000Z"), 3)).toEqual({ level: "atrasado", late: 1 });
    expect(deadlineStatus(deadline, new Date("2026-12-04T15:00:00.000Z"), 3)).toEqual({ level: "atrasado", late: 4 });
  });
});
