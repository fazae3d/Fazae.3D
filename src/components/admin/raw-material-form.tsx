"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { rawMaterialFormSchema, type RawMaterialFormInput } from "@/lib/admin-validation";
import type { RawMaterial } from "@/server/types";

const UNIT_OPTIONS = ["g", "ml", "un", "kg", "l", "cm", "m"];

function labelClass() {
  return "label-caps text-[11px] text-graphite";
}

function inputClass(hasError?: boolean) {
  return `border px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

export type RawMaterialMutationResult = { success: true; rawMaterial: RawMaterial } | { success: false; error: string };
export type RawMaterialFormAction = (input: RawMaterialFormInput) => Promise<RawMaterialMutationResult>;

export function RawMaterialForm({
  rawMaterial,
  action,
}: {
  rawMaterial?: RawMaterial;
  action: RawMaterialFormAction;
}) {
  const router = useRouter();
  const isEditing = Boolean(rawMaterial);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RawMaterialFormInput>({
    resolver: zodResolver(rawMaterialFormSchema),
    defaultValues: rawMaterial
      ? {
          name: rawMaterial.name,
          unit: rawMaterial.unit,
          stock: rawMaterial.stock,
          costPerUnit: rawMaterial.costPerUnit,
          minStock: rawMaterial.minStock ?? "",
        }
      : { unit: "g", stock: 0, costPerUnit: 0, minStock: "" },
  });

  const onSubmit = async (data: RawMaterialFormInput) => {
    setServerError(null);
    const result = await action(data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push("/admin/insumos");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="name">
            Nome
          </label>
          <input id="name" className={inputClass(Boolean(errors.name))} {...register("name")} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="unit">
            Unidade
          </label>
          <select id="unit" className={inputClass(Boolean(errors.unit))} {...register("unit")}>
            {UNIT_OPTIONS.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          {errors.unit && <p className="text-xs text-red-600">{errors.unit.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="stock">
            Estoque
          </label>
          <input
            id="stock"
            type="number"
            step="0.01"
            className={inputClass(Boolean(errors.stock))}
            {...register("stock", { valueAsNumber: true })}
          />
          {errors.stock && <p className="text-xs text-red-600">{errors.stock.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="costPerUnit">
            Custo por unidade (R$)
          </label>
          <input
            id="costPerUnit"
            type="number"
            step="0.01"
            className={inputClass(Boolean(errors.costPerUnit))}
            {...register("costPerUnit", { valueAsNumber: true })}
          />
          {errors.costPerUnit && <p className="text-xs text-red-600">{errors.costPerUnit.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="minStock">
            Estoque mínimo (opcional)
          </label>
          <input
            id="minStock"
            type="number"
            step="0.01"
            className={inputClass()}
            {...register("minStock", { setValueAs: (v) => (v === "" ? "" : Number(v)) })}
          />
          <p className="text-[11px] text-graphite">Usado para avisar de estoque baixo na listagem.</p>
        </div>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="label-caps bg-ink px-8 py-4 text-xs text-paper transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar insumo"}
        </button>
      </div>
    </form>
  );
}
