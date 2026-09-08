import { getAllCategories } from "@/lib/demo-data";
import { getAllMaterials } from "@/server/repositories/material-repository";
import { getAllRawMaterials } from "@/server/repositories/raw-material-repository";
import { ProductForm } from "@/components/admin/product-form";
import { createProductAction } from "../actions";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCategories, fallbackMaterials, fallbackRawMaterials } from "@/server/demo-fallback";

export default async function NewProductPage() {
  const [categories, materials, rawMaterials] = await Promise.all([
    withReadFallback(() => getAllCategories(), fallbackCategories),
    withReadFallback(() => getAllMaterials(), fallbackMaterials),
    withReadFallback(() => getAllRawMaterials(), fallbackRawMaterials),
  ]);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Novo produto</h1>
      <ProductForm categories={categories} materials={materials} rawMaterials={rawMaterials} action={createProductAction} />
    </div>
  );
}
