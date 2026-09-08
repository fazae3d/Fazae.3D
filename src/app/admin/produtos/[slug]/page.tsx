import { notFound } from "next/navigation";
import { getAllCategories, getProduct } from "@/lib/demo-data";
import { getAllMaterials } from "@/server/repositories/material-repository";
import { getAllRawMaterials } from "@/server/repositories/raw-material-repository";
import { getUsagesForProduct } from "@/server/repositories/product-material-usage-repository";
import { ProductForm } from "@/components/admin/product-form";
import { updateProductAction } from "../actions";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackCategories, fallbackMaterials, fallbackProductMaterialUsages, fallbackProducts, fallbackRawMaterials } from "@/server/demo-fallback";

export default async function EditProductPage({ params }: PageProps<"/admin/produtos/[slug]">) {
  const { slug } = await params;
  const product = await withReadFallback(
    () => getProduct(slug),
    fallbackProducts.find((p) => p.slug === slug),
  );
  if (!product) notFound();

  const [categories, materials, rawMaterials, materialUsages] = await Promise.all([
    withReadFallback(() => getAllCategories(), fallbackCategories),
    withReadFallback(() => getAllMaterials(), fallbackMaterials),
    withReadFallback(() => getAllRawMaterials(), fallbackRawMaterials),
    withReadFallback(
      () => getUsagesForProduct(slug),
      fallbackProductMaterialUsages.filter((usage) => usage.productSlug === slug),
    ),
  ]);
  const boundAction = updateProductAction.bind(null, slug);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Editar produto</h1>
      <ProductForm
        product={product}
        categories={categories}
        materials={materials}
        rawMaterials={rawMaterials}
        materialUsages={materialUsages}
        action={boundAction}
      />
    </div>
  );
}
