import type { Product } from "./types";

/** Minúsculo e sem acento: "decoracao" encontra "Decoração". */
export function normalizeSearchText(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * Shared by the server repository (authoritative) and the client search view (instant, on the fetched snapshot).
 * Todas as palavras digitadas precisam aparecer em algum lugar do produto (nome, categoria, tags, material ou descrição),
 * em qualquer ordem: "chaveiro coracao" acha "Chaveiro Coração".
 */
export function matchesSearch(product: Product, term: string) {
  const haystack = normalizeSearchText(
    [product.name, product.categoryName, product.description, ...product.tags, ...product.materials.map((m) => m.material)].join(" "),
  );
  return normalizeSearchText(term)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
