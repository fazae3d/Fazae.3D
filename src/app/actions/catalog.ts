"use server";

import { getAllCategories, getAllProducts } from "@/lib/demo-data";
import { fallbackCategories, fallbackProducts } from "@/server/demo-fallback";

/**
 * The only sanctioned way for a Client Component to read the product/category
 * catalog. Client bundles can't share memory with the server process, so a
 * static `import { products } from "@/lib/demo-data"` inside a "use
 * client" file would freeze a build-time copy that never sees admin
 * edits — this round-trips to the live server store instead.
 *
 * TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco —
 * hoje ainda não há catálogo real para este projeto.
 */
export async function getCatalogSnapshotAction() {
  try {
    const [products, categories] = await Promise.all([getAllProducts(), getAllCategories()]);
    return { products, categories };
  } catch {
    return { products: fallbackProducts, categories: fallbackCategories };
  }
}
