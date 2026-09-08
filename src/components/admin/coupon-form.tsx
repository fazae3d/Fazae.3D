"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { couponFormSchema, type CouponFormInput } from "@/lib/admin-validation";
import type { Coupon, CouponType } from "@/server/types";

const TYPES: { value: CouponType; label: string }[] = [
  { value: "percentual", label: "Percentual (%)" },
  { value: "fixo", label: "Valor fixo (R$)" },
  { value: "frete-gratis", label: "Frete grátis" },
];

function labelClass() {
  return "label-caps text-[11px] text-graphite";
}

function inputClass(hasError?: boolean) {
  return `border px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

export type CouponMutationResult = { success: true; coupon: Coupon } | { success: false; error: string };
export type CouponFormAction = (input: CouponFormInput) => Promise<CouponMutationResult>;

export function CouponForm({ coupon, action }: { coupon?: Coupon; action: CouponFormAction }) {
  const router = useRouter();
  const isEditing = Boolean(coupon);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CouponFormInput>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: coupon
      ? {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          minSubtotal: coupon.minSubtotal ?? "",
          usageLimit: coupon.usageLimit ?? "",
          active: coupon.active,
        }
      : {
          type: "percentual",
          value: 10,
          minSubtotal: "",
          usageLimit: "",
          active: true,
        },
  });

  const selectedType = watch("type");
  const isActive = watch("active");

  const onSubmit = async (data: CouponFormInput) => {
    setServerError(null);
    const result = await action(data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    router.push("/admin/cupons");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="code">
            Código
          </label>
          <input
            id="code"
            disabled={isEditing}
            placeholder="FLUXO10"
            className={`${inputClass(Boolean(errors.code))} uppercase disabled:bg-mist/40 disabled:text-graphite`}
            {...register("code")}
          />
          {errors.code && <p className="text-xs text-red-600">{errors.code.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className={labelClass()}>Tipo</p>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setValue("type", t.value, { shouldValidate: true })}
                className={`label-caps border px-3 py-2 text-[11px] transition-colors ${
                  selectedType === t.value
                    ? "border-ink bg-ink text-paper"
                    : "border-mist text-graphite hover:border-ink"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {selectedType !== "frete-gratis" && (
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="value">
            {selectedType === "percentual" ? "Percentual de desconto" : "Valor do desconto (R$)"}
          </label>
          <input
            id="value"
            type="number"
            step="0.01"
            className={inputClass(Boolean(errors.value))}
            {...register("value", { valueAsNumber: true })}
          />
          {errors.value && <p className="text-xs text-red-600">{errors.value.message}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="minSubtotal">
            Subtotal mínimo (opcional)
          </label>
          <input
            id="minSubtotal"
            type="number"
            step="0.01"
            placeholder="Sem mínimo"
            className={inputClass(Boolean(errors.minSubtotal))}
            {...register("minSubtotal", { setValueAs: (v) => (v === "" ? "" : Number(v)) })}
          />
          {errors.minSubtotal && <p className="text-xs text-red-600">{errors.minSubtotal.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="usageLimit">
            Limite de usos (opcional)
          </label>
          <input
            id="usageLimit"
            type="number"
            placeholder="Sem limite"
            className={inputClass(Boolean(errors.usageLimit))}
            {...register("usageLimit", { setValueAs: (v) => (v === "" ? "" : Number(v)) })}
          />
          {errors.usageLimit && <p className="text-xs text-red-600">{errors.usageLimit.message}</p>}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setValue("active", e.target.checked)}
          className="h-4 w-4 accent-ink"
        />
        Cupom ativo
      </label>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="label-caps bg-ink px-8 py-4 text-xs text-paper transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar cupom"}
        </button>
      </div>
    </form>
  );
}
