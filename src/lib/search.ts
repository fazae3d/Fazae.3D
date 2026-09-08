import type { Product } from "./types";

/** Shared by the server repository (authoritative) and the client search view (instant, on the fetched snapshot). */
export function matchesSearch(product: Product, term: string) {
  const haystack = [product.name, product.categoryName, ...product.tags].join(" ").toLowerCase();
  return haystack.includes(term.toLowerCase());
}
