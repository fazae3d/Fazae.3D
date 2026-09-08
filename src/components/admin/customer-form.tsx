"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { customerCreateSchema, type CustomerCreateInput } from "@/lib/admin-validation";
import type { Customer } from "@/server/types";

function labelClass() {
  return "label-caps text-[11px] text-graphite";
}

function inputClass(hasError?: boolean) {
  return `border px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

export type CustomerMutationResult = { success: true; customer: Customer } | { success: false; error: string };
export type CustomerFormAction = (input: CustomerCreateInput) => Promise<CustomerMutationResult>;

export function CustomerForm({ action }: { action: CustomerFormAction }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CustomerCreateInput>({
    resolver: zodResolver(customerCreateSchema),
    defaultValues: { name: "", phone: "", email: "", notes: "", tagsRaw: "" },
  });

  const onSubmit = async (data: CustomerCreateInput) => {
    setServerError(null);
    const result = await action(data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push(`/admin/clientes/${result.customer.id}`);
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
          <label className={labelClass()} htmlFor="phone">
            Telefone (WhatsApp)
          </label>
          <input
            id="phone"
            placeholder="5584991234567"
            className={inputClass(Boolean(errors.phone))}
            {...register("phone")}
          />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass()} htmlFor="email">
          E-mail (opcional)
        </label>
        <input id="email" className={inputClass(Boolean(errors.email))} {...register("email")} />
        {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass()} htmlFor="notes">
          Notas internas (opcional)
        </label>
        <textarea id="notes" rows={3} className={inputClass()} {...register("notes")} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass()} htmlFor="tagsRaw">
          Tags (separadas por vírgula, opcional)
        </label>
        <input id="tagsRaw" placeholder="fiel, atacado, presencial" className={inputClass()} {...register("tagsRaw")} />
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="label-caps bg-ink px-8 py-4 text-xs text-paper transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : "Criar cliente"}
        </button>
      </div>
    </form>
  );
}
