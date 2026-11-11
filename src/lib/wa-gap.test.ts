import { describe, expect, it } from "vitest";
import { requiredGapMs } from "./wa-cadence";

describe("intervalo entre mensagens automáticas", () => {
  it("fica sempre entre o mínimo e o máximo e é estável para a mesma mensagem", () => {
    for (const id of ["a1", "cmw9n0ae9000107l3", "zzz", "x"]) {
      const gap = requiredGapMs(id, 3, 8);
      expect(gap).toBeGreaterThanOrEqual(3 * 60_000);
      expect(gap).toBeLessThanOrEqual(8 * 60_000);
      expect(requiredGapMs(id, 3, 8)).toBe(gap);
    }
  });
  it("sorteia valores diferentes para mensagens diferentes", () => {
    const gaps = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => requiredGapMs(id, 3, 8)));
    expect(gaps.size).toBeGreaterThan(3);
  });
  it("sem intervalo (0 e 0) não espera; máximo menor que o mínimo vale o mínimo", () => {
    expect(requiredGapMs("a", 0, 0)).toBe(0);
    expect(requiredGapMs("a", 5, 2)).toBe(5 * 60_000);
  });
});
