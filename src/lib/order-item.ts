type ItemLike = { categoryName?: string; material?: string; color?: string; scale?: string };

/** "Chaveiros · PLA · Preto · 5 cm": só o que existe (itens sob medida podem não ter material nem cor). */
export function itemSpecs(item: ItemLike, options: { category?: boolean } = {}) {
  const { category = true } = options;
  return [category ? item.categoryName : undefined, item.material, item.color, item.scale].filter((part) => Boolean(part && part.trim())).join(" · ");
}

/** "PLA, Preto, 5 cm": versão para e-mail e planilha. */
export function itemSpecsInline(item: ItemLike) {
  return [item.material, item.color, item.scale].filter((part) => Boolean(part && part.trim())).join(", ");
}
