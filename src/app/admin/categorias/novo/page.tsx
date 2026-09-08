import { CategoryForm } from "@/components/admin/category-form";
import { createCategoryAction } from "../actions";

export default function NewCategoryPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Nova categoria</h1>
      <CategoryForm action={createCategoryAction} />
    </div>
  );
}
