"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "../form-field";
import { addressSchema, type AddressInput } from "@/lib/validation";
import { formatCPF } from "@/lib/cpf";

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

export function StepEndereco({
  defaultValues,
  onNext,
  onBack,
}: {
  defaultValues?: Partial<AddressInput>;
  onNext: (data: AddressInput) => void;
  onBack: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<AddressInput>({ resolver: zodResolver(addressSchema), defaultValues });

  const cpfField = register("cpf");
  const zipField = register("zip");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const lookupCep = async (rawValue: string) => {
    const digits = rawValue.replace(/\D/g, "");
    if (digits.length !== 8) return;

    setCepLoading(true);
    setCepError(null);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data: ViaCepResponse = await response.json();
      if (data.erro) {
        setCepError("CEP não encontrado.");
        return;
      }
      if (data.logradouro) setValue("street", data.logradouro, { shouldValidate: true });
      if (data.bairro) setValue("neighborhood", data.bairro, { shouldValidate: true });
      if (data.localidade) setValue("city", data.localidade, { shouldValidate: true });
      if (data.uf) setValue("state", data.uf, { shouldValidate: true });
    } catch {
      setCepError("Não foi possível buscar o CEP agora. Preencha o endereço manualmente.");
    } finally {
      setCepLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-5">
      <p className="label-caps text-xs text-graphite">Endereço de entrega</p>

      <div className="grid grid-cols-2 gap-4">
        <FormField id="recipient" label="Destinatário" error={errors.recipient?.message} {...register("recipient")} />
        <FormField
          id="cpf"
          label="CPF"
          placeholder="000.000.000-00"
          inputMode="numeric"
          maxLength={14}
          error={errors.cpf?.message}
          {...cpfField}
          onChange={(e) => {
            e.target.value = formatCPF(e.target.value);
            cpfField.onChange(e);
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <FormField
            id="zip"
            label="CEP"
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            error={errors.zip?.message ?? cepError ?? undefined}
            {...zipField}
            onBlur={(e) => {
              zipField.onBlur(e);
              lookupCep(e.target.value);
            }}
          />
          {cepLoading && <p className="mt-1 text-xs text-graphite">Buscando endereço...</p>}
        </div>
        <FormField id="number" label="Número" error={errors.number?.message} {...register("number")} />
      </div>

      <FormField id="street" label="Rua" error={errors.street?.message} {...register("street")} />
      <FormField id="complement" label="Complemento (opcional)" {...register("complement")} />
      <FormField id="neighborhood" label="Bairro" error={errors.neighborhood?.message} {...register("neighborhood")} />

      <div className="grid grid-cols-2 gap-4">
        <FormField id="city" label="Cidade" error={errors.city?.message} {...register("city")} />
        <FormField id="state" label="Estado (UF)" maxLength={2} error={errors.state?.message} {...register("state")} />
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="label-caps rounded-full border border-paper/15 px-8 py-4 text-xs text-graphite transition-colors hover:border-petrol hover:text-petrol"
        >
          Voltar
        </button>
        <button
          type="submit"
          className="label-caps flex-1 rounded-full bg-petrol py-4 text-xs text-ink transition-colors hover:bg-paper"
        >
          Continuar para entrega
        </button>
      </div>
    </form>
  );
}
