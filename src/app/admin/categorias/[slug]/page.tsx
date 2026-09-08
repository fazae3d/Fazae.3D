import { notFound } from "next/navigation";
import { getCategory } from "@/lib/demo-data";
import { CategoryForm } from "@/components/admin/category-form";
import { updateCategoryAction } from "../actions";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCategories } from "@/server/demo-fallback";

export default async function EditCategoryPage({ params }: PageProps<"/admin/categorias/[slug]">) {
  const { slug } = await params;
  const category = await withReadFallback(
    () => getCategory(slug),
    fallbackCategories.find((c) => c.slug === slug),
  );
  if (!category) notFound();

  const boundAction = updateCategoryAction.bind(null, slug);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Editar categoria</h1>
      <CategoryForm category={category} action={boundAction} />
    </div>
  );
}
