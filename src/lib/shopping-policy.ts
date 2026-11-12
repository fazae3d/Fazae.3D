/**
 * Produtos que as políticas do Google Shopping não aceitam ou restringem (armas e acessórios de arma, e acessórios de fumo da
 * categoria Head Shop). Ficam fora do feed do Merchant Center e sem preço nos dados estruturados da página, para não reprovar nem
 * suspender a conta. Continuam à venda normalmente na loja e as páginas continuam indexáveis (texto e fotos).
 */
const EXCLUDED_SLUGS = new Set(["porta-municao"]);
/** Tudo o que for cadastrado nestas categorias também fica de fora (inclusive produtos novos), menos incensários, que o Google aceita. */
const EXCLUDED_CATEGORIES = new Set(["head-shop"]);
const INCENSE_PATTERN = /incens/i;
const EXCLUDED_NAME_PATTERN = /muni[cç][aã]o|arma|armas|pistola|revolver|rev[oó]lver/i;

/** Incensário (porta incenso): vai para o Google Shopping mesmo estando na categoria Head Shop. */
export function isIncense(product: { name: string }): boolean {
  return INCENSE_PATTERN.test(product.name);
}

export function isExcludedFromShopping(product: { slug: string; name: string; categorySlug?: string }): boolean {
  return EXCLUDED_SLUGS.has(product.slug) || (product.categorySlug !== undefined && EXCLUDED_CATEGORIES.has(product.categorySlug) && !isIncense(product)) || EXCLUDED_NAME_PATTERN.test(product.name);
}
