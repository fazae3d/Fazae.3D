import { MaterialForm } from "@/components/admin/material-form";
import { createMaterialAction } from "../actions";

export default function NewMaterialPage() {
  return (
    <div className="max-w-3xl">
      <h1 className="font-display mb-8 text-2xl sm:text-3xl">Novo material</h1>
      <MaterialForm action={createMaterialAction} />
    </div>
  );
}
