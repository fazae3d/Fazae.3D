"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateOrderDetailsAction } from "@/app/admin/pedidos/actions";
import { Select } from "@/components/select";
import { useToast } from "@/components/admin/toast";
import { formatPrice } from "@/lib/format";
import { paymentAfterEdit, totalsFor } from "@/lib/order-edit";
import { parseMoneyInput } from "@/lib/payment";
import type { OrderItem } from "@/server/types";

export type EditableOrder = {
  id: string;
  total: number;
  shipping: number;
  discount: number;
  depositAmount?: number;
  paymentStatus?: string;
  items: OrderItem[];
};

export type CatalogOption = { slug: string; name: string; price?: number };

type Row = {
  key: number;
  productSlug: string;
  name: string;
  material: string;
  color: string;
  scale: string;
  quantity: string;
  price: string;
  custom: boolean;
};

const FIELD = "w-full rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol";
const money = (n: number) => String(n).replace(".", ",");

function toRows(items: OrderItem[]): Row[] {
  return items.map((item, i) => ({
    key: i,
    productSlug: item.productSlug,
    name: item.name,
    material: item.material ?? "",
    color: item.color ?? "",
    scale: item.scale ?? "",
    quantity: String(item.quantity),
    price: money(item.price),
    custom: item.productSlug.startsWith("avulso-"),
  }));
}

/**
 * Edição de um pedido já lançado: trocar quantidade e preço, tirar ou acrescentar itens (do catálogo ou avulsos), mudar frete e
 * dar desconto. Mostra na hora o novo total e o que isso muda no pagamento (saldo a receber ou valor pago a mais).
 */
export function OrderEditor({ order, catalog }: { order: EditableOrder; catalog: CatalogOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Row[]>(() => toRows(order.items));
  const [shipping, setShipping] = useState(money(order.shipping));
  const [discount, setDiscount] = useState(money(order.discount));
  const [nextKey, setNextKey] = useState(1000);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lines = rows.map((r) => ({ quantity: Math.max(0, Math.floor(Number(r.quantity) || 0)), price: parseMoneyInput(r.price) }));
  const { subtotal, total } = totalsFor(lines, parseMoneyInput(shipping), parseMoneyInput(discount));
  const pay = paymentAfterEdit(order, total);
  const changed = total !== order.total || JSON.stringify(rows.map((r) => [r.productSlug, r.name, r.quantity, r.price])) !== JSON.stringify(toRows(order.items).map((r) => [r.productSlug, r.name, r.quantity, r.price])) || parseMoneyInput(shipping) !== order.shipping || parseMoneyInput(discount) !== order.discount;

  const reset = () => {
    setRows(toRows(order.items));
    setShipping(money(order.shipping));
    setDiscount(money(order.discount));
    setError(null);
  };
  const update = (key: number, patch: Partial<Row>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addCatalog = (slug: string) => {
    const product = catalog.find((p) => p.slug === slug);
    if (!product) return;
    setRows((prev) => [...prev, { key: nextKey, productSlug: product.slug, name: product.name, material: "", color: "", scale: "", quantity: "1", price: money(product.price ?? 0), custom: false }]);
    setNextKey((k) => k + 1);
  };
  const addCustom = () => {
    setRows((prev) => [...prev, { key: nextKey, productSlug: "", name: "", material: "", color: "", scale: "", quantity: "1", price: "0", custom: true }]);
    setNextKey((k) => k + 1);
  };

  const save = async () => {
    setPending(true);
    setError(null);
    const result = await updateOrderDetailsAction(order.id, {
      items: rows.map((r) => ({
        productSlug: r.productSlug || undefined,
        name: r.name,
        material: r.material,
        color: r.color,
        scale: r.scale || undefined,
        quantity: Math.floor(Number(r.quantity) || 0),
        price: parseMoneyInput(r.price),
      })),
      shipping: parseMoneyInput(shipping),
      discount: parseMoneyInput(discount),
    });
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    toast(
      result.balanceDue > 0
        ? `Pedido atualizado: novo total ${formatPrice(result.total)}, falta receber ${formatPrice(result.balanceDue)}.`
        : result.overpaid > 0
          ? `Pedido atualizado: novo total ${formatPrice(result.total)}. O cliente pagou ${formatPrice(result.overpaid)} a mais.`
          : `Pedido atualizado: novo total ${formatPrice(result.total)}.`,
    );
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <div className="mb-3 border-t border-mist pt-4">
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg border border-mist px-3.5 py-2 text-xs font-medium transition-colors hover:border-petrol">
          Editar pedido (itens, valores, desconto)
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3 rounded-xl border border-petrol/60 p-4">
      <p className="text-sm font-semibold">Editar pedido {order.id}</p>
      <p className="mb-3 mt-1 text-xs text-graphite">Troque quantidades e preços, tire ou acrescente itens e dê desconto. O novo total aparece abaixo antes de salvar.</p>

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.key} className="rounded-lg border border-mist p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_90px_120px_auto]">
              <div>
                <label className="mb-1 block text-[11px] text-graphite">{r.custom ? "Item avulso (nome)" : "Item"}</label>
                {r.custom ? (
                  <input value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} placeholder="Nome do item" className={FIELD} />
                ) : (
                  <p className="py-2 text-sm">
                    {r.name}
                    {r.material || r.color ? <span className="text-xs text-graphite"> · {[r.material, r.color].filter(Boolean).join(" ")}</span> : null}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-graphite">Qtd</label>
                <input value={r.quantity} onChange={(e) => update(r.key, { quantity: e.target.value.replace(/\D/g, "") })} inputMode="numeric" className={FIELD} />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-graphite">Preço unitário (R$)</label>
                <input value={r.price} onChange={(e) => update(r.key, { price: e.target.value })} inputMode="decimal" className={FIELD} />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                  disabled={rows.length <= 1}
                  className="rounded-lg border border-mist px-3 py-2 text-xs hover:border-red-500 hover:text-red-500 disabled:opacity-40"
                >
                  Tirar
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div className="min-w-[220px]">
          <Select
            value=""
            onChange={addCatalog}
            placeholder="+ Acrescentar produto do catálogo…"
            options={catalog.map((p) => ({ value: p.slug, label: `${p.name}${p.price !== undefined ? ` (${formatPrice(p.price)})` : ""}` }))}
            className="border border-mist px-2.5 py-2 text-sm focus:border-petrol"
          />
        </div>
        <button type="button" onClick={addCustom} className="rounded-lg border border-mist px-3 py-2 text-xs hover:border-petrol">
          + Item avulso
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px] text-graphite">Frete (R$)</label>
          <input value={shipping} onChange={(e) => setShipping(e.target.value)} inputMode="decimal" className={FIELD} />
        </div>
        <div>
          <label className="mb-1 block text-[11px] text-graphite">Desconto total do pedido (R$)</label>
          <input value={discount} onChange={(e) => setDiscount(e.target.value)} inputMode="decimal" className={FIELD} />
        </div>
      </div>

      <div className="mt-4 space-y-0.5 rounded-lg bg-mist/40 p-3 text-sm">
        <p className="flex justify-between">
          <span className="text-graphite">Itens</span> <span>{formatPrice(subtotal)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-graphite">Frete</span> <span>{formatPrice(parseMoneyInput(shipping))}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-graphite">Desconto</span> <span>{parseMoneyInput(discount) > 0 ? `- ${formatPrice(parseMoneyInput(discount))}` : formatPrice(0)}</span>
        </p>
        <p className="flex justify-between border-t border-mist pt-1 font-semibold">
          <span>Novo total</span>
          <span>
            {formatPrice(total)} {total !== order.total ? <span className="text-xs font-normal text-graphite">(era {formatPrice(order.total)})</span> : null}
          </span>
        </p>
        {pay.balanceDue > 0 ? <p className="pt-1 text-xs text-amber-500">Já recebido {formatPrice(pay.depositAmount)}. Vai ficar {formatPrice(pay.balanceDue)} a receber.</p> : null}
        {pay.overpaid > 0 ? <p className="pt-1 text-xs text-amber-500">O cliente já pagou {formatPrice(pay.overpaid)} a mais do que o novo total: devolva ou deixe como crédito.</p> : null}
      </div>

      {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={pending || !changed} className="rounded-lg bg-petrol px-5 py-2 text-sm font-semibold text-[#111] disabled:opacity-50">
          {pending ? "Salvando…" : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="text-sm text-graphite hover:text-ink"
        >
          Cancelar
        </button>
      </div>
      <p className="mt-3 text-xs text-graphite">
        O estoque e os insumos acompanham a diferença de quantidade. Se entrou item que precisa ser produzido, use &quot;Enviar para a produção&quot; logo abaixo. A taxa do marketplace não é recalculada.
      </p>
    </div>
  );
}
