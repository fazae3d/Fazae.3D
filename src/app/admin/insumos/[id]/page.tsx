import { notFound } from "next/navigation";
import { getRawMaterial } from "@/server/repositories/raw-material-repository";
import { RawMaterialForm } from "@/components/admin/raw-material-form";
import { updateRawMaterialAction } from "../actions";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackRawMaterials } from "@/server/demo-fallback";

export default async function EditRawMaterialPage({ params }: PageProps<"/admin/insumos/[id]">) {
  const { id } = await params;
  const rawMaterial = await withReadFallback(
    () => getRawMaterial(id),
    fallbackRawMaterials.find((rm) => rm.id === id),
  );
  if (!rawMaterial) notFound();

  const boundAction = updateRawMaterialAction.bind(null, id);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Editar insumo</h1>
      <RawMaterialForm rawMaterial={rawMaterial} action={boundAction} />
    </div>
  );
}
