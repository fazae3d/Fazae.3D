import { describe, expect, it } from "vitest";
import { isExcludedFromShopping } from "./shopping-policy";

describe("produtos fora do Google Shopping", () => {
  it("tudo da categoria Head Shop fica de fora, inclusive produto novo", () => {
    expect(isExcludedFromShopping({ slug: "cinzeiro-dado", name: "Cinzeiro Dado", categorySlug: "head-shop" })).toBe(true);
    expect(isExcludedFromShopping({ slug: "qualquer-coisa-nova", name: "Peça nova", categorySlug: "head-shop" })).toBe(true);
  });
  it("mantém a regra antiga de armas e acessórios de arma", () => {
    expect(isExcludedFromShopping({ slug: "porta-municao", name: "Porta Munição", categorySlug: "utilidades" })).toBe(true);
    expect(isExcludedFromShopping({ slug: "x", name: "Suporte de Pistola", categorySlug: "utilidades" })).toBe(true);
  });
  it("chaveiros e decoração continuam no feed", () => {
    expect(isExcludedFromShopping({ slug: "chaveiro-astronauta", name: "Chaveiro Astronauta", categorySlug: "casa-decor" })).toBe(false);
  });
});
