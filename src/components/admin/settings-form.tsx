"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { updateSettingsAction, type SettingsFormInput } from "@/app/admin/configuracoes/actions";
import { useToast } from "@/components/admin/toast";
import { DEFAULT_LOCAL_DELIVERY_FEE, DEFAULT_LOCAL_DELIVERY_THRESHOLD } from "@/lib/local-delivery";
import { DEFAULT_PIX_DISCOUNT_PCT } from "@/lib/money";
import type { StoreSettings } from "@/server/types";

const LABEL = "mb-1.5 block text-xs font-medium text-graphite";

function inputClass(hasError?: boolean) {
  return `w-full rounded-lg border bg-transparent px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="admin-card rounded-xl border border-mist p-5 sm:p-6">
      <h2 className="text-sm font-semibold">{title}</h2>
      <p className="mb-5 mt-1 text-xs text-graphite">{description}</p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({ label, hint, error, htmlFor, wide, children }: { label: string; hint?: string; error?: string; htmlFor: string; wide?: boolean; children: ReactNode }) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <label className={LABEL} htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
      {hint ? <p className="mt-1 text-xs text-graphite">{hint}</p> : null}
    </div>
  );
}

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const { toast } = useToast();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsFormInput>({
    defaultValues: {
      ...settings,
      originCep: settings.originCep ?? "",
      localDeliveryThreshold: settings.localDeliveryThreshold ?? DEFAULT_LOCAL_DELIVERY_THRESHOLD,
      localDeliveryFee: settings.localDeliveryFee ?? DEFAULT_LOCAL_DELIVERY_FEE,
      pixDiscountPct: settings.pixDiscountPct ?? DEFAULT_PIX_DISCOUNT_PCT,
    },
  });

  const onSubmit = async (data: SettingsFormInput) => {
    setServerError(null);
    const result = await updateSettingsAction({
      freeShippingThreshold: Number(data.freeShippingThreshold),
      localDeliveryThreshold: Number(data.localDeliveryThreshold),
      localDeliveryFee: Number(data.localDeliveryFee),
      pixDiscountPct: Number(data.pixDiscountPct),
      whatsappNumber: data.whatsappNumber.replace(/\D/g, ""),
      originCep: data.originCep?.replace(/\D/g, "") ?? "",
    });
    if (!result.success) {
      setServerError(result.error);
      toast(result.error, "error");
      return;
    }
    toast("Configurações salvas");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <Section title="Frete" description="Regras de frete grátis exibidas na barra de anúncio, no carrinho e no checkout.">
        <Field
          label="Frete grátis para todo o Brasil a partir de (R$)"
          htmlFor="freeShippingThreshold"
          error={errors.freeShippingThreshold?.message}
          hint="Também vale para o cálculo real do frete (Melhor Envio) no checkout."
          wide
        >
          <input
            id="freeShippingThreshold"
            type="number"
            step="0.01"
            className={inputClass(Boolean(errors.freeShippingThreshold))}
            {...register("freeShippingThreshold", { valueAsNumber: true })}
          />
        </Field>
        <Field label="CEP de origem (de onde você envia)" htmlFor="originCep" error={errors.originCep?.message} hint="Sem isso o checkout usa a tabela de frete fixa." wide>
          <input id="originCep" placeholder="00000000" maxLength={9} className={inputClass(Boolean(errors.originCep))} {...register("originCep")} />
        </Field>
      </Section>

      <Section
        title="Entrega por motoboy (Natal e Parnamirim)"
        description="Só aparece para CEPs de Natal/RN e Parnamirim/RN, sempre no topo das opções de frete."
      >
        <Field label="Frete grátis a partir de (R$)" htmlFor="localDeliveryThreshold" error={errors.localDeliveryThreshold?.message}>
          <input
            id="localDeliveryThreshold"
            type="number"
            step="0.01"
            className={inputClass(Boolean(errors.localDeliveryThreshold))}
            {...register("localDeliveryThreshold", { valueAsNumber: true })}
          />
        </Field>
        <Field label="Valor abaixo desse mínimo (R$)" htmlFor="localDeliveryFee" error={errors.localDeliveryFee?.message}>
          <input
            id="localDeliveryFee"
            type="number"
            step="0.01"
            className={inputClass(Boolean(errors.localDeliveryFee))}
            {...register("localDeliveryFee", { valueAsNumber: true })}
          />
        </Field>
      </Section>

      <Section title="Pagamento" description="Preço exibido como “no Pix” na loja inteira.">
        <Field label="Desconto no Pix (%)" htmlFor="pixDiscountPct" error={errors.pixDiscountPct?.message} hint="Aparece nos produtos, na busca, no carrinho e na barra de anúncio.">
          <input
            id="pixDiscountPct"
            type="number"
            step="0.1"
            min="0"
            max="90"
            className={inputClass(Boolean(errors.pixDiscountPct))}
            {...register("pixDiscountPct", { valueAsNumber: true })}
          />
        </Field>
      </Section>

      <Section title="Contato" description="Usado no rodapé, na página de contato, no botão flutuante e nos orçamentos em PDF.">
        <Field label="Número de WhatsApp" htmlFor="whatsappNumber" error={errors.whatsappNumber?.message} hint="Só números, com DDI e DDD (ex.: 5584999999999)." wide>
          <input id="whatsappNumber" placeholder="5584999999999" className={inputClass(Boolean(errors.whatsappNumber))} {...register("whatsappNumber")} />
        </Field>
      </Section>

      {serverError ? <p className="text-sm text-red-500">{serverError}</p> : null}

      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-lg bg-petrol px-6 py-3 text-sm font-semibold text-[#111] transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {isSubmitting ? "Salvando…" : "Salvar configurações"}
        </button>
      </div>
    </form>
  );
}
