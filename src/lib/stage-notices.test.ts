import { describe, expect, it } from "vitest";
import { STAGE_NOTICES, isNoticeEvent, stageNoticeFor } from "./stage-notices";
import { DEFAULT_RULES } from "./store-rules";

describe("avisos por etapa da produção", () => {
  it("cada etapa tem um aviso próprio e uma regra de envio automático desligada", () => {
    expect(STAGE_NOTICES.map((n) => n.stage)).toEqual(["inicio", "em_producao", "finalizado"]);
    expect(new Set(STAGE_NOTICES.map((n) => n.event)).size).toBe(3);
    for (const n of STAGE_NOTICES) expect(DEFAULT_RULES.automation[n.autoRule]).toBe(false);
  });
  it("acha o aviso pela etapa e recusa evento desconhecido", () => {
    expect(stageNoticeFor("em_producao")?.event).toBe("producao");
    expect(stageNoticeFor("nao_aplicavel")).toBeUndefined();
    expect(isNoticeEvent("pronto")).toBe(true);
    expect(isNoticeEvent("pago")).toBe(false);
  });
});
