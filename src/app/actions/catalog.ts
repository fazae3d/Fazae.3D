"use server";

import { getAllCategories, getAllProducts } from "@/lib/demo-data";
import { publicCategories, publicProducts } from "@/lib/visibility";
import { fallbackCategories, fallbackProducts } from "@/server/demo-fallback";

/**
 * The only sanctioned way for a Client Component to read the product/category
 * catalog. Client bundles can't share memory with the server process, so a
 * static `import { products } from "@/lib/demo-data"` inside a "use
 * client" file would freeze a build-time copy that never sees admin
 * edits, this round-trips to the live server store instead.
 *
 * TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco
 * hoje ainda não há catálogo real para este projeto.
 */
export async function getCatalogSnapshotAction() {
  try {
    const [products, categories] = await Promise.all([getAllProducts(), getAllCategories()]);
    // laborCost (custo de mão de obra) é dado interno: não vai para o navegador.
    return {
      products: publicProducts(products).map(({ laborCost: _laborCost, ...publicProduct }) => publicProduct),
      categories: publicCategories(categories),
    };
  } catch {
    return { products: fallbackProducts, categories: fallbackCategories };
  }
}
