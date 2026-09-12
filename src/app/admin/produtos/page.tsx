import Link from "next/link";
import { getAllCategories, getAllProducts } from "@/lib/demo-data";
import { isSoldOut } from "@/lib/badges";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCategories, fallbackProducts } from "@/server/demo-fallback";
import { matchesSearch } from "@/lib/search";
import { formatPrice } from "@/lib/format";
import { DeleteProductButton } from "@/components/admin/delete-product-button";
import { SelectField } from "@/components/select-field";
import { ProductThumb } from "@/components/product-thumb";
import type { Product } from "@/lib/types";

type SortKey = "name" | "price-asc" | "price-desc" | "stock-asc";

function priceOrZero(p: Product) {
  return p.price ?? 0;
}

const SORTERS: Record<SortKey, (a: Product, b: Product) => number> = {
  name: (a, b) => a.name.localeCompare(b.name, "pt-BR"),
  "price-asc": (a, b) => priceOrZero(a) - priceOrZero(b),
  "price-desc": (a, b) => priceOrZero(b) - priceOrZero(a),
  "stock-asc": (a, b) => a.stock - b.stock,
};

const SORT_LABELS: Record<SortKey, string> = {
  name: "Nome (A-Z)",
  "price-asc": "Preço (menor)",
  "price-desc": "Preço (maior)",
  "stock-asc": "Estoque (menor)",
};

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const categoryFilter = params.category ?? "";
  const statusFilter = params.status ?? "";
  const sort: SortKey =
    params.sort === "price-asc" || params.sort === "price-desc" || params.sort === "stock-asc"
      ? params.sort
      : "name";

  const categories = await withReadFallback(() => getAllCategories(), fallbackCategories);

  const allProducts = await withReadFallback(() => getAllProducts(), fallbackProducts);
  const products = allProducts
    .filter((p) => !query || matchesSearch(p, query))
    .filter((p) => !categoryFilter || p.categorySlug === categoryFilter)
    .filter((p) => !statusFilter || (statusFilter === "esgotado" ? isSoldOut(p) : !isSoldOut(p)))
    .sort(SORTERS[sort]);

  const hasFilters = query || categoryFilter || statusFilter || sort !== "name";

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl">Produtos</h1>
        <Link
          href="/admin/produtos/novo"
          className="label-caps border border-ink px-5 py-3 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Novo produto
        </Link>
      </div>

      <form className="mb-6 flex flex-wrap gap-3" action="/admin/produtos">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Buscar por produto ou categoria"
          className="min-w-[220px] flex-1 border border-mist px-3 py-2.5 text-base outline-none focus:border-petrol sm:text-sm"
        />
        <SelectField
          name="category"
          defaultValue={categoryFilter}
          className="min-w-[180px] border border-mist bg-paper px-3 py-2.5 text-sm focus:border-petrol"
          options={[
            { value: "", label: "Todas as categorias" },
            ...categories.map((c) => ({ value: c.slug, label: c.name })),
          ]}
        />
        <SelectField
          name="status"
          defaultValue={statusFilter}
          className="min-w-[160px] border border-mist bg-paper px-3 py-2.5 text-sm focus:border-petrol"
          options={[
            { value: "", label: "Todos os status" },
            { value: "ativo", label: "Ativo" },
            { value: "esgotado", label: "Esgotado" },
          ]}
        />
        <SelectField
          name="sort"
          defaultValue={sort}
          className="min-w-[160px] border border-mist bg-paper px-3 py-2.5 text-sm focus:border-petrol"
          options={(Object.keys(SORT_LABELS) as SortKey[]).map((key) => ({ value: key, label: SORT_LABELS[key] }))}
        />
        <button
          type="submit"
          className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Aplicar
        </button>
        {hasFilters && (
          <Link
            href="/admin/produtos"
            className="label-caps flex items-center px-2 text-[11px] text-graphite hover:text-petrol"
          >
            Limpar
          </Link>
        )}
      </form>

      <p className="mb-4 text-sm text-graphite">{products.length} produto(s) encontrado(s)</p>

      {products.length === 0 ? (
        <div className="border border-mist px-6 py-16 text-center text-graphite">
          Nenhum produto encontrado para esses filtros.
        </div>
      ) : (
        <div className="overflow-x-auto border border-mist">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist bg-mist/30">
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Produto</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Categoria</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Preço</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Estoque</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Status</th>
                <th className="label-caps px-4 py-3 text-[11px] text-graphite">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {products.map((product) => (
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
                  <td className="px-4 py-3">{product.price !== undefined ? formatPrice(product.price) : "Sob consulta"}</td>
                  <td className="px-4 py-3">{product.stock}</td>
                  <td className="px-4 py-3">
                    {isSoldOut(product) ? (
                      <span className="label-caps text-[10px] text-graphite">Esgotado</span>
                    ) : (
                      <span className="label-caps text-[10px] text-petrol">Ativo</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/admin/produtos/${product.slug}`}
                        className="label-caps text-[11px] text-graphite hover:text-petrol"
                      >
                        Editar
                      </Link>
                      <DeleteProductButton slug={product.slug} categorySlug={product.categorySlug} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
