import { notFound } from "next/navigation";
import { getMaterial } from "@/server/repositories/material-repository";
import { MaterialForm } from "@/components/admin/material-form";
import { updateMaterialAction } from "../actions";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackMaterials } from "@/server/demo-fallback";

export default async function EditMaterialPage({ params }: PageProps<"/admin/materiais/[slug]">) {
  const { slug } = await params;
  const material = await withReadFallback(
    () => getMaterial(slug),
    fallbackMaterials.find((m) => m.slug === slug),
  );
  if (!material) notFound();

  const boundAction = updateMaterialAction.bind(null, slug);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Editar material</h1>
      <MaterialForm material={material} action={boundAction} />
    </div>
  );
}
