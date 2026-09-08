import { RawMaterialForm } from "@/components/admin/raw-material-form";
import { createRawMaterialAction } from "../actions";

export default function NewRawMaterialPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Novo insumo</h1>
      <RawMaterialForm action={createRawMaterialAction} />
    </div>
  );
}
