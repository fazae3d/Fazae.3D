import Link from "next/link";
import { getAllProducts } from "@/lib/demo-data";
import { LOW_STOCK_THRESHOLD, isSoldOut } from "@/lib/badges";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackProducts } from "@/server/demo-fallback";
import { matchesSearch } from "@/lib/search";
import { ProductThumb } from "@/components/product-thumb";
import { StockQuickEdit } from "@/components/admin/stock-quick-edit";
import type { Product } from "@/lib/types";

type SortKey = "stock-asc" | "stock-desc" | "name";

const SORTERS: Record<SortKey, (a: Product, b: Product) => number> = {
  "stock-asc": (a, b) => a.stock - b.stock,
  "stock-desc": (a, b) => b.stock - a.stock,
  name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
};

const SORT_LABELS: Record<SortKey, string> = {
  "stock-asc": "Estoque (menor)",
  "stock-desc": "Estoque (maior)",
  name: "Nome (A-Z)",
};

function stockStatus(product: Product) {
  if (isSoldOut(product)) return { label: "Esgotado", className: "text-graphite" };
  if (product.stock <= LOW_STOCK_THRESHOLD) return { label: "Estoque baixo", className: "text-sand" };
  return { label: "Em estoque", className: "text-petrol" };
}

export default async function AdminStockPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const sort: SortKey = params.sort === "stock-desc" || params.sort === "name" ? params.sort : "stock-asc";

  const allProducts = await withReadFallback(() => getAllProducts(), fallbackProducts);
  const products = allProducts.filter((p) => !query || matchesSearch(p, query)).sort(SORTERS[sort]);

  const soldOutCount = products.filter(isSoldOut).length;
  const lowStockCount = products.filter((p) => !isSoldOut(p) && p.stock <= LOW_STOCK_THRESHOLD).length;

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl">Estoque</h1>
        <p className="text-sm text-graphite">
          {products.length} produto(s) · {lowStockCount} com estoque baixo · {soldOutCount} esgotado(s)
        </p>
      </div>

      <form className="mb-6 flex flex-wrap gap-3" action="/admin/estoque">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Buscar por produto, marca ou categoria"
          className="min-w-[240px] flex-1 border border-mist px-3 py-2.5 text-base outline-none focus:border-petrol sm:text-sm"
        />
        <select
          name="sort"
          defaultValue={sort}
          className="border border-mist bg-paper px-3 py-2.5 text-base outline-none focus:border-petrol sm:text-sm"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
            <option key={key} value={key}>
              {SORT_LABELS[key]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Aplicar
        </button>
        {(query || sort !== "stock-asc") && (
          <Link
            href="/admin/estoque"
            className="label-caps flex items-center px-2 text-[11px] text-graphite hover:text-petrol"
          >
            Limpar
          </Link>
        )}
      </form>

      {products.length === 0 ? (
        <div className="border border-mist px-6 py-16 text-center text-graphite">
          Nenhum produto encontrado para essa busca.
        </div>
      ) : (
        <div className="overflow-x-auto border border-mist">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist bg-mist/30">
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Produto</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Marca</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Status</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Estoque</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {products.map((product) => {
                const status = stockStatus(product);
                return (
                  <tr key={product.slug}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-10 shrink-0 overflow-hidden bg-mist/40">
                          <ProductThumb product={product} className="h-full w-full" />
                        </div>
                        <Link href={`/admin/produtos/${product.slug}`} className="hover:text-petrol">
                          {product.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-graphite">{product.categoryName}</td>
                    <td className="px-4 py-3">
                      <span className={`label-caps text-[10px] ${status.className}`}>{status.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StockQuickEdit slug={product.slug} initialStock={product.stock} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
