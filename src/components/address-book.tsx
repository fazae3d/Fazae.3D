"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createAddressAction,
  deleteAddressAction,
  updateAddressAction,
} from "@/app/(storefront)/conta/enderecos/actions";
import { FormField } from "./form-field";
import { formatCPF } from "@/lib/cpf";
import { savedAddressSchema, type SavedAddressInput } from "@/lib/validation";
import type { Address } from "@/server/types";

type ViaCepResponse = {
  erro?: boolean;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
};

function AddressForm({
  addressId,
  defaultValues,
  onSaved,
  onCancel,
}: {
  addressId?: string;
  defaultValues?: SavedAddressInput;
  onSaved: (address: Address) => void;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SavedAddressInput>({ resolver: zodResolver(savedAddressSchema), defaultValues });

  const cpfField = register("cpf");
  const zipField = register("zip");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  const onSubmit = async (data: SavedAddressInput) => {
    setFormError(null);
    const result = addressId ? await updateAddressAction(addressId, data) : await createAddressAction(data);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    onSaved(result.address);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 border border-paper/15 p-5">
      <FormField id="label" label="Nome do endereço (ex: Casa, Trabalho)" error={errors.label?.message} {...register("label")} />

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

      {formError && <p className="text-xs text-red-600">{formError}</p>}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="label-caps rounded-full border border-paper/15 px-6 py-3 text-xs text-graphite transition-colors hover:border-petrol hover:text-petrol"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="label-caps flex-1 rounded-full bg-petrol py-3 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
        >
          {isSubmitting ? "Salvando..." : "Salvar endereço"}
        </button>
      </div>
    </form>
  );
}

function DeleteAddressButton({ addressId, onDeleted }: { addressId: string; onDeleted: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-[11px]">
        <span className="text-graphite">Excluir?</span>
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const result = await deleteAddressAction(addressId);
            if (!result.success) {
              setError(result.error);
              setPending(false);
              setConfirming(false);
              return;
            }
            onDeleted();
          }}
          className="label-caps text-red-600 hover:underline disabled:opacity-60"
        >
          Sim
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="label-caps text-graphite hover:underline">
          Não
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="label-caps text-[11px] text-graphite hover:text-red-600"
      >
        Excluir
      </button>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </>
  );
}

export function AddressBook({ initialAddresses }: { initialAddresses: Address[] }) {
  const [addresses, setAddresses] = useState(initialAddresses);
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingAddress = editingId ? addresses.find((a) => a.id === editingId) : undefined;

  const handleSaved = (address: Address) => {
    setAddresses((prev) => {
      const exists = prev.some((a) => a.id === address.id);
      return exists ? prev.map((a) => (a.id === address.id ? address : a)) : [...prev, address];
    });
    setMode("list");
    setEditingId(null);
  };

  if (mode === "add") {
    return <AddressForm onSaved={handleSaved} onCancel={() => setMode("list")} />;
  }

  if (mode === "edit" && editingAddress) {
    return (
      <AddressForm
        addressId={editingAddress.id}
        defaultValues={{ ...editingAddress, complement: editingAddress.complement ?? "" }}
        onSaved={handleSaved}
        onCancel={() => {
          setMode("list");
          setEditingId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-3">
      {addresses.length === 0 ? (
        <p className="border border-paper/15 p-6 text-sm text-graphite">Nenhum endereço salvo ainda.</p>
      ) : (
        <ul className="space-y-3">
          {addresses.map((address) => (
            <li key={address.id} className="border border-paper/15 p-5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-paper">{address.label}</p>
                  <p className="mt-1 text-graphite">{address.recipient}</p>
                  <p className="text-graphite">
                    {address.street}, {address.number}
                    {address.complement ? ` · ${address.complement}` : ""} · {address.neighborhood}
                  </p>
                  <p className="text-graphite">
                    {address.city}/{address.state} · {address.zip}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(address.id);
                      setMode("edit");
                    }}
                    className="label-caps text-[11px] text-graphite hover:text-petrol"
                  >
                    Editar
                  </button>
                  <DeleteAddressButton
                    addressId={address.id}
                    onDeleted={() => setAddresses((prev) => prev.filter((a) => a.id !== address.id))}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setMode("add")}
        className="label-caps rounded-full border border-petrol px-5 py-3 text-xs text-petrol transition-colors hover:bg-petrol hover:text-ink"
      >
        Adicionar endereço
      </button>
    </div>
  );
}
