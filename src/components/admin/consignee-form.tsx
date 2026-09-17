"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { consigneeFormSchema, type ConsigneeFormInput } from "@/lib/admin-validation";
import { formatDocument } from "@/lib/cpf";
import type { Consignee } from "@/server/types";

type ConsigneeMutationResult = { success: true; consignee: Consignee } | { success: false; error: string };
export type ConsigneeFormAction = (input: ConsigneeFormInput) => Promise<ConsigneeMutationResult>;

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

function labelClass() {
  return "label-caps text-[11px] text-graphite";
}

function inputClass(hasError?: boolean) {
  return `border px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

export function ConsigneeForm({
  action,
  defaultValues,
  submitLabel = "Criar lojista",
  onSuccess,
}: {
  action: ConsigneeFormAction;
  defaultValues?: Partial<ConsigneeFormInput>;
  submitLabel?: string;
  onSuccess: (consignee: Consignee) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ConsigneeFormInput>({
    resolver: zodResolver(consigneeFormSchema),
    defaultValues: {
      name: "",
      document: "",
      phone: "",
      email: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
      zip: "",
      notes: "",
      ...defaultValues,
    },
  });

  const documentField = register("document");
  const zipField = register("zip");

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

  const onSubmit = async (data: ConsigneeFormInput) => {
    setServerError(null);
    const result = await action(data);
    if (!result.success) {
      setServerError(result.error);
      return;
    }
    onSuccess(result.consignee);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="name">
            Nome / razão social
          </label>
          <input id="name" className={inputClass(Boolean(errors.name))} {...register("name")} />
          {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="document">
            CPF ou CNPJ
          </label>
          <input
            id="document"
            placeholder="000.000.000-00"
            inputMode="numeric"
            maxLength={18}
            className={inputClass(Boolean(errors.document))}
            {...documentField}
            onChange={(e) => {
              e.target.value = formatDocument(e.target.value);
              documentField.onChange(e);
            }}
          />
          {errors.document && <p className="text-xs text-red-600">{errors.document.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="phone">
            Telefone
          </label>
          <input
            id="phone"
            placeholder="5584991234567"
            className={inputClass(Boolean(errors.phone))}
            {...register("phone")}
          />
          {errors.phone && <p className="text-xs text-red-600">{errors.phone.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="email">
            E-mail (opcional)
          </label>
          <input id="email" className={inputClass(Boolean(errors.email))} {...register("email")} />
          {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
        </div>
      </div>

      <p className="label-caps -mb-2 text-xs text-graphite">Endereço (opcional)</p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="zip">
            CEP
          </label>
          <input
            id="zip"
            placeholder="00000-000"
            inputMode="numeric"
            maxLength={9}
            className={inputClass()}
            {...zipField}
            onBlur={(e) => {
              zipField.onBlur(e);
              lookupCep(e.target.value);
            }}
          />
          {cepLoading && <p className="text-xs text-graphite">Buscando endereço...</p>}
          {cepError && <p className="text-xs text-red-600">{cepError}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="number">
            Número
          </label>
          <input id="number" className={inputClass()} {...register("number")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass()} htmlFor="street">
          Rua
        </label>
        <input id="street" className={inputClass()} {...register("street")} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="complement">
            Complemento
          </label>
          <input id="complement" className={inputClass()} {...register("complement")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="neighborhood">
            Bairro
          </label>
          <input id="neighborhood" className={inputClass()} {...register("neighborhood")} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="city">
            Cidade
          </label>
          <input id="city" className={inputClass()} {...register("city")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="state">
            Estado (UF)
          </label>
          <input id="state" maxLength={2} className={inputClass()} {...register("state")} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className={labelClass()} htmlFor="notes">
          Observações (opcional)
        </label>
        <textarea
          id="notes"
          rows={3}
          placeholder="Combinações particulares, prazo, comissão, etc."
          className={inputClass()}
          {...register("notes")}
        />
      </div>

      {serverError && <p className="text-sm text-red-600">{serverError}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="label-caps bg-ink px-8 py-4 text-xs text-paper transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
