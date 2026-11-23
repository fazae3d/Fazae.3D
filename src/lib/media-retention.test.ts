import { describe, expect, it } from "vitest";
import { isBigFileType, isMediaExpired, mediaCutoff } from "./media-retention";

const now = new Date("2026-11-23T12:00:00Z");
const keep = { mediaKeepDays: 90, bigFileKeepDays: 14 };
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);

describe("retenção de arquivos do WhatsApp", () => {
  it("vídeo e documento são arquivos pesados; foto e áudio não", () => {
    expect(isBigFileType("video")).toBe(true);
    expect(isBigFileType("document")).toBe(true);
    expect(isBigFileType("image")).toBe(false);
    expect(isBigFileType("audio")).toBe(false);
    expect(isBigFileType(null)).toBe(false);
  });

  it("0 dias significa guardar para sempre", () => {
    expect(mediaCutoff(0, now)).toBeNull();
    expect(mediaCutoff(-5, now)).toBeNull();
    expect(isMediaExpired("video", daysAgo(500), { mediaKeepDays: 0, bigFileKeepDays: 0 }, now)).toBe(false);
  });

  it("vídeo vence no prazo curto e foto no prazo longo", () => {
    expect(isMediaExpired("video", daysAgo(15), keep, now)).toBe(true);
    expect(isMediaExpired("video", daysAgo(13), keep, now)).toBe(false);
    expect(isMediaExpired("image", daysAgo(15), keep, now)).toBe(false);
    expect(isMediaExpired("image", daysAgo(91), keep, now)).toBe(true);
  });

  it("cada prazo é independente", () => {
    expect(isMediaExpired("video", daysAgo(100), { mediaKeepDays: 0, bigFileKeepDays: 30 }, now)).toBe(true);
    expect(isMediaExpired("image", daysAgo(100), { mediaKeepDays: 0, bigFileKeepDays: 30 }, now)).toBe(false);
  });
});
