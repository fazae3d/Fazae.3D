"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { updateSettingsAction, type SettingsFormInput } from "@/app/admin/configuracoes/actions";
import type { StoreSettings } from "@/server/types";

function labelClass() {
  return "label-caps text-[11px] text-graphite";
}

function inputClass(hasError?: boolean) {
  return `border px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormInput>({ defaultValues: settings });

  const onSubmit = async (data: SettingsFormInput) => {
    setServerError(null);
    setSaved(false);
    const result = await updateSettingsAction({
      freeShippingThreshold: Number(data.freeShippingThreshold),
      whatsappNumber: data.whatsappNumber.replace(/\D/g, ""),
    });
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex max-w-xl flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label className={labelClass()} htmlFor="freeShippingThreshold">
          Frete grátis a partir de (R$)
        </label>
        <input
          id="freeShippingThreshold"
          type="number"
          step="0.01"
          className={inputClass(Boolean(errors.freeShippingThreshold))}
          {...register("freeShippingThreshold", { valueAsNumber: true })}
        />
        {errors.freeShippingThreshold && (
          <p className="text-xs text-red-600">{errors.freeShippingThreshold.message}</p>
        )}
        <p className="text-xs text-graphite">
          Usado na barra de anúncio, no carrinho e no cálculo real do frete no checkout.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass()} htmlFor="whatsappNumber">
          Número de WhatsApp
        </label>
        <input
          id="whatsappNumber"
          placeholder="5584999999999"
          className={inputClass(Boolean(errors.whatsappNumber))}
          {...register("whatsappNumber")}
        />
        {errors.whatsappNumber && <p className="text-xs text-red-600">{errors.whatsappNumber.message}</p>}
        <p className="text-xs text-graphite">
          Apenas números, com DDI e DDD (ex: 5584999999999). Usado no rodapé, na página de contato e no botão
          flutuante.
        </p>
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}
      {saved && <p className="text-sm text-petrol">Configurações salvas.</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="label-caps bg-ink px-8 py-4 text-xs text-paper transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}
