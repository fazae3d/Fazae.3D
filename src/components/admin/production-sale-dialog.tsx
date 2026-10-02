"use client";

import { useState } from "react";
import { launchProductionItemAsSaleAction } from "@/app/admin/producao/actions";
import { PAYMENT_METHODS, STATUSES } from "@/components/admin/manual-sale-form";
import { Select } from "@/components/select";
import { formatPrice } from "@/lib/format";
import type { OrderStatus, PaymentMethod, ProductionItem } from "@/server/types";

export type SaleProduct = {
  slug: string;
  price?: number;
  materials: { material: string; colors: string[] }[];
};

function labelClass() {
  return "label-caps text-[11px] text-graphite";
}

function inputClass(hasError?: boolean) {
  return `border bg-transparent px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

/** "Lançar como venda" — same data the manual sale form asks for, but the single sale line comes from the production item. */
export function ProductionSaleDialog({
  item,
  product,
  onClose,
  onDone,
}: {
  item: ProductionItem;
  product?: SaleProduct;
  onClose: () => void;
  onDone: () => void;
}) {
  const [channel, setChannel] = useState<"presencial" | "whatsapp">("presencial");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [status, setStatus] = useState<OrderStatus>("Pagamento aprovado");
  const [material, setMaterial] = useState(product?.materials[0]?.material ?? "");
  const [color, setColor] = useState(product?.materials[0]?.colors[0] ?? "");
  const [quantity, setQuantity] = useState(item.quantity);
  const [unitPrice, setUnitPrice] = useState(product?.price ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleMaterialChange = (value: string) => {
    setMaterial(value);
    setColor(product?.materials.find((m) => m.material === value)?.colors[0] ?? "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!customerName.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    setSubmitting(true);
    const result = await launchProductionItemAsSaleAction(item.id, {
      channel,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || undefined,
      paymentMethod,
      status,
      quantity,
      unitPrice,
      material: product ? material : undefined,
      color: product ? color : undefined,
    });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onDone();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Lançar como venda"
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[90vh] w-full max-w-lg flex-col gap-5 overflow-y-auto border border-mist bg-paper p-5 text-ink"
      >
        <div>
          <p className="label-caps text-xs text-graphite">Lançar como venda</p>
          <p className="mt-1 text-sm">{item.description}</p>
          <p className="mt-1 text-xs text-graphite">
            A venda entra com a fase e o prazo atuais da produção, e este item deixa de aparecer como interno. O
            estoque não é alterado.
          </p>
        </div>

        <div>
          <p className={labelClass() + " mb-2"}>Canal da venda</p>
          <div className="flex gap-2">
            {(["presencial", "whatsapp"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={`label-caps border px-4 py-2.5 text-[11px] transition-colors ${
                  channel === c ? "border-ink bg-ink text-paper" : "border-mist text-graphite hover:border-ink"
                }`}
              >
                {c === "presencial" ? "Presencial" : "WhatsApp"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass()} htmlFor="sale-customer">
              Nome do cliente
            </label>
            <input
              id="sale-customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={inputClass()}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass()} htmlFor="sale-phone">
              Telefone (opcional)
            </label>
            <input
              id="sale-phone"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="84999999999"
              className={inputClass()}
            />
          </div>
        </div>

        <div>
          <p className={labelClass() + " mb-2"}>Forma de pagamento</p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.value}
                type="button"
                onClick={() => setPaymentMethod(method.value)}
                className={`label-caps border px-4 py-2.5 text-[11px] transition-colors ${
                  paymentMethod === method.value
                    ? "border-ink bg-ink text-paper"
                    : "border-mist text-graphite hover:border-ink"
                }`}
              >
                {method.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="sale-status">
            Status do pedido
          </label>
          <Select
            id="sale-status"
            value={status}
            onChange={(v) => setStatus(v as OrderStatus)}
            className={inputClass()}
            options={STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </div>

        {product && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className={labelClass()}>Material</label>
              <Select
                value={material}
                onChange={handleMaterialChange}
                className={inputClass()}
                options={product.materials.map((m) => ({ value: m.material, label: m.material }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className={labelClass()}>Cor</label>
              <Select
                value={color}
                onChange={setColor}
                className={inputClass()}
                options={(product.materials.find((m) => m.material === material)?.colors ?? []).map((c) => ({
                  value: c,
                  label: c,
                }))}
              />
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass()} htmlFor="sale-qty">
              Qtd
            </label>
            <input
              id="sale-qty"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className={`w-24 ${inputClass()}`}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass()} htmlFor="sale-price">
              Preço unit. (R$)
            </label>
            <input
              id="sale-price"
              type="number"
              step="0.01"
              min={0}
              value={unitPrice}
              onChange={(e) => setUnitPrice(Math.max(0, Number(e.target.value) || 0))}
              className={`w-32 ${inputClass()}`}
            />
          </div>
          <div className="ml-auto text-right">
            <p className={labelClass()}>Total</p>
            <p className="font-display text-xl">{formatPrice(unitPrice * quantity)}</p>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="label-caps bg-ink px-6 py-3 text-xs text-paper transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
          >
            {submitting ? "Registrando..." : "Registrar venda"}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="label-caps border border-mist px-6 py-3 text-xs text-graphite transition-colors hover:border-ink"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
