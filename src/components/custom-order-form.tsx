"use client";

import { useState, type FormEvent } from "react";
import { FormField } from "./form-field";
import { SelectField } from "@/components/select-field";
import { DEFAULT_WHATSAPP_NUMBER, getWhatsAppLink } from "@/lib/site-config";

const MATERIALS = ["Não sei / quero sugestão", "PLA", "PETG", "ABS", "Resina"];

function buildMessage(data: Record<string, string>) {
  const lines = [
    "Olá! Quero um orçamento de peça sob encomenda na Fazaê.",
    "",
    `Nome: ${data.name}`,
    `Descrição: ${data.description}`,
    data.material && `Material: ${data.material}`,
    data.color && `Cor desejada: ${data.color}`,
    `Quantidade: ${data.quantity || "1"}`,
    data.deadline && `Prazo desejado: ${data.deadline}`,
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * TODO(fase DB): além de abrir o WhatsApp, também gravar isto como
 * CustomOrderRequest (ver desenho de schema combinado com o usuário) assim
 * que a Fazaê tiver o próprio banco — hoje o envio é só client-side.
 */
export function CustomOrderForm() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries()) as Record<string, string>;
    const message = buildMessage(data);
    window.open(getWhatsAppLink(DEFAULT_WHATSAPP_NUMBER, message), "_blank", "noopener,noreferrer");
    setSent(true);
  };

  if (sent) {
    return (
      <div className="border border-petrol/40 bg-petrol/10 p-6 text-sm text-paper">
        Pedido montado! Abrimos o WhatsApp em outra aba com sua descrição pronta. É só confirmar o
        envio por lá para falar com a gente.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField id="name" name="name" label="Seu nome" required />
        <FormField id="phone" name="phone" label="WhatsApp" type="tel" placeholder="(84) 99999-9999" required />
      </div>
      <FormField id="email" name="email" label="E-mail (opcional)" type="email" />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="label-caps text-[11px] text-graphite">
          O que você quer criar?
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          required
          placeholder="Descreva a peça, envie referências que já tiver em mãos, tamanho aproximado, para que serve..."
          className="border border-paper/15 bg-mist px-3 py-2.5 text-base text-paper outline-none transition-colors placeholder:text-paper/40 focus:border-petrol sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="material" className="label-caps text-[11px] text-graphite">
            Material
          </label>
          <SelectField
            id="material"
            name="material"
            defaultValue={MATERIALS[0]}
            className="border border-paper/15 bg-mist px-3 py-2.5 text-base text-paper outline-none transition-colors focus:border-petrol sm:text-sm"
            menuClassName="border border-paper/15 bg-mist text-paper"
            hoverClassName="hover:bg-paper/10"
            options={MATERIALS.map((m) => ({ value: m, label: m }))}
          />
        </div>
        <FormField id="color" name="color" label="Cor desejada (opcional)" placeholder="Ex: preto fosco" />
        <FormField id="quantity" name="quantity" label="Quantidade" type="number" min={1} defaultValue={1} />
      </div>

      <FormField
        id="deadline"
        name="deadline"
        label="Prazo desejado (opcional)"
        placeholder="Ex: sem pressa, ou até dia X"
      />

      <button
        type="submit"
        className="label-caps inline-flex w-fit items-center gap-2 rounded-full bg-petrol px-8 py-4 text-xs text-ink transition-colors hover:bg-paper"
      >
        Enviar e abrir WhatsApp
      </button>
    </form>
  );
}
