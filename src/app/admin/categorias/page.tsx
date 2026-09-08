import Link from "next/link";
import { getAllCategories } from "@/lib/demo-data";
import { DeleteCategoryButton } from "@/components/admin/delete-category-button";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCategories } from "@/server/demo-fallback";

export default async function AdminCategoriesPage() {
  const categories = await withReadFallback(() => getAllCategories(), fallbackCategories);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl sm:text-3xl">Categorias</h1>
        <Link
          href="/admin/categorias/novo"
          className="label-caps border border-ink px-5 py-3 text-xs transition-colors hover:bg-ink hover:text-paper"
        >
          Nova categoria
        </Link>
      </div>

      <div className="overflow-x-auto border border-mist">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-mist bg-mist/30">
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Categoria</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Descrição</th>
              <th className="label-caps px-4 py-3 text-[11px] text-graphite">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {categories.map((category) => (
              <tr key={category.slug}>
                <td className="px-4 py-3">
                  <Link href={`/admin/categorias/${category.slug}`} className="hover:text-petrol">
                    {category.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-graphite">{category.description}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/categorias/${category.slug}`}
                      className="label-caps text-[11px] text-graphite hover:text-petrol"
                    >
                      Editar
                    </Link>
                    <DeleteCategoryButton slug={category.slug} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
