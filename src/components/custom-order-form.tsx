"use client";

import { trackEvent } from "@/lib/analytics";
import { useState, type FormEvent } from "react";
import { FormField } from "./form-field";
import { SelectField } from "@/components/select-field";
import { submitCustomOrderAction } from "@/app/(storefront)/personalizado/actions";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { formatPhone } from "@/lib/br-format";
import { getWhatsAppLink } from "@/lib/site-config";

const MATERIALS = ["Não sei / quero sugestão", "PLA", "PETG", "ABS", "Resina"];

function buildMessage(data: Record<string, string>) {
  const lines = [
    "Olá! Quero um orçamento de peça sob encomenda na Fazaê.",
    "",
    `Nome: ${data.name}`,
    `WhatsApp: ${data.phone}`,
    data.email && `E-mail: ${data.email}`,
    `Descrição: ${data.description}`,
    data.material && `Material: ${data.material}`,
    data.color && `Cor desejada: ${data.color}`,
    `Quantidade: ${data.quantity || "1"}`,
    data.deadline && `Prazo desejado: ${data.deadline}`,
  ].filter(Boolean);
  return lines.join("\n");
}

/**
 * Grava o pedido como lead (o painel mostra em Encomendas) e, em seguida, abre o WhatsApp com a descrição pronta.
 * Se o navegador bloquear a aba nova, a tela de sucesso traz o botão para abrir manualmente.
 */
export function CustomOrderForm({ referenceProductSlug, defaultDescription }: { referenceProductSlug?: string; defaultDescription?: string }) {
  const { settings } = useStoreSettings();
  const [sentLink, setSentLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const data = Object.fromEntries(form.entries()) as Record<string, string>;

    setSubmitting(true);
    const result = await submitCustomOrderAction({
      name: data.name,
      phone: data.phone,
      email: data.email,
      description: data.description,
      material: data.material,
      color: data.color,
      quantity: Number(data.quantity) || 1,
      deadline: data.deadline,
      referenceProductSlug,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }

    trackEvent("generate_lead", { lead_type: "peca_personalizada", quantity: Number(data.quantity) || 1 });
    const link = getWhatsAppLink(settings.whatsappNumber, buildMessage(data));
    window.open(link, "_blank", "noopener,noreferrer");
    setSentLink(link);
  };

  if (sentLink) {
    return (
      <div className="border border-petrol/40 bg-petrol/10 p-6 text-sm text-paper">
        <p>
          Recebemos o seu pedido! Já está registrado aqui e a gente te chama no WhatsApp. Se quiser adiantar, é só confirmar o envio da
          mensagem pronta.
        </p>
        <a
          href={sentLink}
          target="_blank"
          rel="noopener noreferrer"
          className="label-caps mt-4 inline-flex rounded-full border border-petrol px-6 py-3 text-xs text-petrol transition-colors hover:bg-petrol hover:text-ink"
        >
          Abrir WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <FormField id="name" name="name" label="Seu nome" required maxLength={100} />
        <FormField
          id="phone"
          name="phone"
          label="WhatsApp"
          type="tel"
          placeholder="(84) 99999-9999"
          maxLength={15}
          required
          onChange={(e) => {
            e.target.value = formatPhone(e.target.value);
          }}
        />
      </div>
      <FormField id="email" name="email" label="E-mail (opcional)" type="email" maxLength={200} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="description" className="label-caps text-[11px] text-graphite">
          O que você quer criar?
        </label>
        <textarea
          id="description"
          name="description"
          rows={5}
          required
          minLength={10}
          maxLength={2000}
          defaultValue={defaultDescription}
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
        <FormField id="color" name="color" label="Cor desejada (opcional)" placeholder="Ex: preto fosco" maxLength={60} />
        <FormField id="quantity" name="quantity" label="Quantidade" type="number" min={1} max={999} defaultValue={1} />
      </div>

      <FormField
        id="deadline"
        name="deadline"
        label="Prazo desejado (opcional)"
        placeholder="Ex: sem pressa, ou até dia X"
        maxLength={100}
      />

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="label-caps inline-flex w-fit items-center gap-2 rounded-full bg-petrol px-8 py-4 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Enviar e abrir WhatsApp"}
      </button>
    </form>
  );
}
