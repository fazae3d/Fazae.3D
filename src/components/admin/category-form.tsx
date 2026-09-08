"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categoryFormSchema, type CategoryFormInput } from "@/lib/admin-validation";
import type { Category } from "@/lib/types";

function labelClass() {
  return "label-caps text-[11px] text-graphite";
}

function inputClass(hasError?: boolean) {
  return `border px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

export type CategoryMutationResult = { success: true; category: Category } | { success: false; error: string };
export type CategoryFormAction = (input: CategoryFormInput) => Promise<CategoryMutationResult>;

export function CategoryForm({ category, action }: { category?: Category; action: CategoryFormAction }) {
  const router = useRouter();
  const isEditing = Boolean(category);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormInput>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: category
      ? {
          slug: category.slug,
          name: category.name,
          description: category.description,
          icon: category.icon ?? "",
        }
      : {},
  });

  const onSubmit = async (data: CategoryFormInput) => {
    setServerError(null);
    const result = await action(data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push("/admin/categorias");
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

      <div className="flex flex-col gap-1.5">
        <label className={labelClass()} htmlFor="description">
          Descrição
        </label>
        <textarea
          id="description"
          rows={3}
          className={inputClass(Boolean(errors.description))}
          {...register("description")}
        />
        {errors.description && <p className="text-xs text-red-600">{errors.description.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass()} htmlFor="icon">
          Ícone (opcional)
        </label>
        <input id="icon" className={inputClass()} {...register("icon")} />
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="label-caps bg-ink px-8 py-4 text-xs text-paper transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar categoria"}
        </button>
      </div>
    </form>
  );
}
