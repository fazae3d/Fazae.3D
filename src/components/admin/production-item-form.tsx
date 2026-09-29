"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/select";
import { createProductionItemAction } from "@/app/admin/producao/actions";

type ProductOption = { slug: string; name: string };

export function ProductionItemForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [productSlug, setProductSlug] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleProductChange = (slug: string) => {
    setProductSlug(slug);
    const product = products.find((p) => p.slug === slug);
    if (product && !description) setDescription(product.name);
  };

  const handleAdd = async () => {
    setError(null);
    setSubmitting(true);
    const result = await createProductionItemAction({
      productSlug: productSlug || undefined,
      description: description.trim(),
      quantity: Number(quantity) || 1,
      deadline: deadline || undefined,
      notes: notes || undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setProductSlug("");
    setDescription("");
    setQuantity("1");
    setDeadline("");
    setNotes("");
    router.refresh();
  };

  return (
    <div className="mb-6 border border-mist p-5">
      <p className="label-caps mb-4 text-xs text-graphite">Registrar item de produção</p>
      <p className="mb-4 text-xs text-graphite">
        Pra peças feitas por conta própria (estoque, amostra, teste) — sem venda ou encomenda associada.
      </p>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[11px] text-graphite">Produto do catálogo (opcional)</label>
          <Select
            value={productSlug}
            onChange={handleProductChange}
            placeholder="Sem produto do catálogo"
            options={products.map((p) => ({ value: p.slug, label: p.name }))}
          />
        </div>
        <div className="flex flex-col gap-1.5 lg:col-span-2">
          <label className="label-caps text-[11px] text-graphite" htmlFor="pi-desc">
            Descrição
          </label>
          <input
            id="pi-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Chaveiro Coração (amostra)"
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[11px] text-graphite" htmlFor="pi-qty">
            Quantidade
          </label>
          <input
            id="pi-qty"
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[11px] text-graphite" htmlFor="pi-deadline">
            Prazo (opcional)
          </label>
          <input
            id="pi-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-3">
          <label className="label-caps text-[11px] text-graphite" htmlFor="pi-notes">
            Notas (opcional)
          </label>
          <input
            id="pi-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={submitting || !description.trim()}
        className="label-caps border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {submitting ? "Registrando..." : "Registrar item"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
