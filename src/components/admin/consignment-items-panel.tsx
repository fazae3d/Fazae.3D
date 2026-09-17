"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/select";
import { formatPrice } from "@/lib/format";
import { deliverItemAction, registerSaleReturnAction } from "@/app/admin/consignacao/actions";
import type { ConsignmentItemWithProduct } from "@/server/types";

type AvailableProduct = { slug: string; name: string; stock: number };

function SaleReturnRow({ consigneeId, item }: { consigneeId: string; item: ConsignmentItemWithProduct }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantitySold, setQuantitySold] = useState("");
  const [quantityReturned, setQuantityReturned] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setError(null);
    setSubmitting(true);
    const result = await registerSaleReturnAction(consigneeId, {
      productSlug: item.productSlug,
      quantitySold: quantitySold ? Number(quantitySold) : undefined,
      quantityReturned: quantityReturned ? Number(quantityReturned) : undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setQuantitySold("");
    setQuantityReturned("");
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="label-caps text-[11px] text-graphite hover:text-petrol">
        Registrar venda/devolução
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label className="label-caps text-[10px] text-graphite">Vendidas</label>
        <input
          type="number"
          min={0}
          value={quantitySold}
          onChange={(e) => setQuantitySold(e.target.value)}
          className="w-20 border border-mist bg-transparent px-2 py-1.5 text-sm outline-none focus:border-petrol"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="label-caps text-[10px] text-graphite">Devolvidas</label>
        <input
          type="number"
          min={0}
          value={quantityReturned}
          onChange={(e) => setQuantityReturned(e.target.value)}
          className="w-20 border border-mist bg-transparent px-2 py-1.5 text-sm outline-none focus:border-petrol"
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="label-caps border border-ink px-3 py-1.5 text-[11px] transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {submitting ? "Salvando..." : "Confirmar"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="label-caps text-[11px] text-graphite hover:underline">
        Cancelar
      </button>
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
    </div>
  );
}

export function ConsignmentItemsPanel({
  consigneeId,
  items,
  availableProducts,
}: {
  consigneeId: string;
  items: ConsignmentItemWithProduct[];
  availableProducts: AvailableProduct[];
}) {
  const router = useRouter();
  const [productSlug, setProductSlug] = useState("");
  const [consignedPrice, setConsignedPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedProduct = availableProducts.find((p) => p.slug === productSlug);

  const handleDeliver = async () => {
    setError(null);
    setSubmitting(true);
    const result = await deliverItemAction(consigneeId, {
      productSlug,
      consignedPrice: Number(consignedPrice),
      quantity: Number(quantity),
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setProductSlug("");
    setConsignedPrice("");
    setQuantity("");
    router.refresh();
  };

  return (
    <div className="border border-mist p-5">
      <p className="label-caps mb-4 text-xs text-graphite">Peças na loja {items.length > 0 && `(${items.length})`}</p>

      {items.length > 0 && (
        <div className="mb-5 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist">
                <th className="label-caps px-2 py-2 text-[11px] text-graphite">Produto</th>
                <th className="label-caps px-2 py-2 text-[11px] text-graphite">Preço combinado</th>
                <th className="label-caps px-2 py-2 text-[11px] text-graphite">Quantidade</th>
                <th className="label-caps px-2 py-2 text-[11px] text-graphite">Subtotal</th>
                <th className="label-caps px-2 py-2 text-[11px] text-graphite">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-2 py-2.5">{item.productName}</td>
                  <td className="px-2 py-2.5">{formatPrice(item.consignedPrice)}</td>
                  <td className="px-2 py-2.5">{item.quantity}</td>
                  <td className="px-2 py-2.5">{formatPrice(item.consignedPrice * item.quantity)}</td>
                  <td className="px-2 py-2.5">
                    <SaleReturnRow consigneeId={consigneeId} item={item} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="label-caps mb-3 mt-2 text-[11px] text-graphite">Entregar mais peças</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="label-caps text-[10px] text-graphite">Produto</label>
          <Select
            value={productSlug}
            onChange={setProductSlug}
            placeholder="Selecione"
            options={availableProducts.map((p) => ({ value: p.slug, label: `${p.name} (${p.stock} em estoque)` }))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[10px] text-graphite">Preço combinado (R$)</label>
          <input
            type="number"
            step="0.01"
            min={0}
            value={consignedPrice}
            onChange={(e) => setConsignedPrice(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="label-caps text-[10px] text-graphite">Quantidade</label>
          <input
            type="number"
            min={1}
            max={selectedProduct?.stock}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={handleDeliver}
        disabled={submitting || !productSlug || !consignedPrice || !quantity}
        className="label-caps mt-3 border border-ink px-5 py-2.5 text-xs transition-colors hover:bg-ink hover:text-paper disabled:opacity-60"
      >
        {submitting ? "Registrando..." : "Registrar entrega"}
      </button>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
