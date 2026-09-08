"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { materialFormSchema, type MaterialFormInput } from "@/lib/admin-validation";
import type { Material } from "@/lib/types";

function labelClass() {
  return "label-caps text-[11px] text-graphite";
}

function inputClass(hasError?: boolean) {
  return `border px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

export type MaterialMutationResult = { success: true; material: Material } | { success: false; error: string };
export type MaterialFormAction = (input: MaterialFormInput) => Promise<MaterialMutationResult>;

export function MaterialForm({ material, action }: { material?: Material; action: MaterialFormAction }) {
  const router = useRouter();
  const isEditing = Boolean(material);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<MaterialFormInput>({
    resolver: zodResolver(materialFormSchema),
    defaultValues: material
      ? { slug: material.slug, name: material.name, colors: material.colors }
      : { colors: [{ name: "Preto", hex: "#111111" }] },
  });

  const colorFields = useFieldArray({ control, name: "colors" });

  const onSubmit = async (data: MaterialFormInput) => {
    setServerError(null);
    const result = await action(data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push("/admin/materiais");
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
          <label className={labelClass()} htmlFor="slug">
            Slug (URL)
          </label>
          <input
            id="slug"
            disabled={isEditing}
            className={`${inputClass(Boolean(errors.slug))} disabled:bg-mist/40 disabled:text-graphite`}
            {...register("slug")}
          />
          {errors.slug && <p className="text-xs text-red-600">{errors.slug.message}</p>}
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className={labelClass()}>Cores</p>
          <button
            type="button"
            onClick={() => colorFields.append({ name: "", hex: "#111111" })}
            className="label-caps text-[11px] text-petrol hover:underline"
          >
            + adicionar cor
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {colorFields.fields.map((field, index) => (
            <div key={field.id} className="flex items-center gap-2">
              <input
                type="color"
                className="h-9 w-9 shrink-0 border border-mist"
                {...register(`colors.${index}.hex`)}
              />
              <input
                placeholder="Nome da cor"
                className={`flex-1 ${inputClass(Boolean(errors.colors?.[index]?.name))}`}
                {...register(`colors.${index}.name`)}
              />
              <button
                type="button"
                onClick={() => colorFields.remove(index)}
                disabled={colorFields.fields.length <= 1}
                className="label-caps px-2 text-[11px] text-graphite hover:text-red-600 disabled:opacity-30"
              >
                remover
              </button>
            </div>
          ))}
        </div>
        {errors.colors && !Array.isArray(errors.colors) && (
          <p className="mt-1 text-xs text-red-600">{errors.colors.message}</p>
        )}
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="label-caps bg-ink px-8 py-4 text-xs text-paper transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar material"}
        </button>
      </div>
    </form>
  );
}
