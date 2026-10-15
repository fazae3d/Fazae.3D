"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/select";
import { AdminIcon } from "@/components/admin/admin-icons";
import { useToast } from "@/components/admin/toast";
import { saveQuoteAction } from "@/app/admin/orcamentos/actions";
import { formatPrice } from "@/lib/format";
import { computeQuoteTotals } from "@/lib/quote";
import { round2 } from "@/lib/money";

export type QuoteProductOption = { slug: string; name: string; price?: number };
export type QuoteCustomerOption = { name: string; phone: string; email?: string };

type ItemState = { description: string; details: string; quantity: string; unitPrice: string; productSlug: string };

export type QuoteFormInitial = {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerDocument: string;
  customerAddress: string;
  title: string;
  items: { description: string; details?: string; quantity: number; unitPrice: number; productSlug?: string }[];
  discount: number;
  shipping: number;
  validUntil: string;
  deliveryTime: string;
  paymentTerms: string;
  notes: string;
  linkedRequestId?: string;
};

const INPUT = "w-full rounded-lg border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol";
const LABEL = "mb-1.5 block text-xs font-medium text-graphite";

/** "1.234,50" / "12,5" / "12.5" → número; vazio ou inválido → 0. */
function parseMoney(value: string) {
  const text = value.trim();
  if (!text) return 0;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
}

function moneyText(value: number) {
  return value ? String(value).replace(".", ",") : "";
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className={LABEL}>{label}</label>
      {children}
    </div>
  );
}

function Card({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="admin-card rounded-xl border border-mist p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function QuoteForm({
  quoteId,
  initial,
  products,
  customers,
}: {
  quoteId: string | null;
  initial: QuoteFormInitial;
  products: QuoteProductOption[];
  customers: QuoteCustomerOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [customerName, setCustomerName] = useState(initial.customerName);
  const [customerPhone, setCustomerPhone] = useState(initial.customerPhone);
  const [customerEmail, setCustomerEmail] = useState(initial.customerEmail);
  const [customerDocument, setCustomerDocument] = useState(initial.customerDocument);
  const [customerAddress, setCustomerAddress] = useState(initial.customerAddress);
  const [title, setTitle] = useState(initial.title);
  const [items, setItems] = useState<ItemState[]>(
    initial.items.length
      ? initial.items.map((i) => ({
          description: i.description,
          details: i.details ?? "",
          quantity: String(i.quantity),
          unitPrice: moneyText(i.unitPrice),
          productSlug: i.productSlug ?? "",
        }))
      : [{ description: "", details: "", quantity: "1", unitPrice: "", productSlug: "" }],
  );
  const [discountMode, setDiscountMode] = useState<"valor" | "pct">("valor");
  const [discountInput, setDiscountInput] = useState(moneyText(initial.discount));
  const [shippingInput, setShippingInput] = useState(moneyText(initial.shipping));
  const [validUntil, setValidUntil] = useState(initial.validUntil);
  const [deliveryTime, setDeliveryTime] = useState(initial.deliveryTime);
  const [paymentTerms, setPaymentTerms] = useState(initial.paymentTerms);
  const [notes, setNotes] = useState(initial.notes);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parsedItems = useMemo(
    () => items.map((i) => ({ quantity: Math.max(0, Math.floor(Number(i.quantity)) || 0), unitPrice: parseMoney(i.unitPrice) })),
    [items],
  );
  const subtotal = computeQuoteTotals(parsedItems, 0, 0).subtotal;
  const discountValue = discountMode === "pct" ? round2(subtotal * (Math.min(parseMoney(discountInput), 100) / 100)) : parseMoney(discountInput);
  const totals = computeQuoteTotals(parsedItems, discountValue, parseMoney(shippingInput));

  const updateItem = (index: number, patch: Partial<ItemState>) =>
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const pickProduct = (index: number, slug: string) => {
    const product = products.find((p) => p.slug === slug);
    if (!product) {
      updateItem(index, { productSlug: "" });
      return;
    }
    updateItem(index, {
      productSlug: slug,
      description: product.name,
      unitPrice: product.price !== undefined ? moneyText(product.price) : items[index].unitPrice,
    });
  };

  const pickCustomer = (phone: string) => {
    const customer = customers.find((c) => c.phone === phone);
    if (!customer) return;
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    if (customer.email) setCustomerEmail(customer.email);
  };

  const handleSave = async () => {
    setError(null);
    setSaving(true);
    const result = await saveQuoteAction(quoteId, {
      customerName,
      customerPhone,
      customerEmail,
      customerDocument,
      customerAddress,
      title,
      items: items.map((item) => ({
        description: item.description,
        details: item.details,
        quantity: Math.floor(Number(item.quantity)) || 0,
        unitPrice: parseMoney(item.unitPrice),
        productSlug: item.productSlug || undefined,
      })),
      discount: totals.discount,
      shipping: totals.shipping,
      validUntil,
      deliveryTime,
      paymentTerms,
      notes,
      linkedRequestId: initial.linkedRequestId,
    });
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      toast(result.error, "error");
      return;
    }
    toast(quoteId ? "Orçamento atualizado" : "Orçamento criado");
    router.push(`/admin/orcamentos/${result.id}`);
    router.refresh();
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="flex flex-col gap-6">
        <Card
          title="Cliente"
          aside={
            customers.length > 0 ? (
              <div className="w-56">
                <Select
                  value=""
                  onChange={pickCustomer}
                  placeholder="Buscar cliente cadastrado"
                  options={customers.map((c) => ({ value: c.phone, label: `${c.name} · ${c.phone}` }))}
                  className="rounded-lg border border-mist bg-transparent px-3 py-1.5 text-xs focus:border-petrol"
                />
              </div>
            ) : null
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Nome *" className="sm:col-span-2">
              <input className={INPUT} value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Nome ou empresa" />
            </Field>
            <Field label="WhatsApp">
              <input className={INPUT} value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="(84) 99999-9999" inputMode="tel" />
            </Field>
            <Field label="E-mail">
              <input className={INPUT} value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="cliente@email.com" inputMode="email" />
            </Field>
            <Field label="CPF ou CNPJ (opcional)">
              <input className={INPUT} value={customerDocument} onChange={(e) => setCustomerDocument(e.target.value)} />
            </Field>
            <Field label="Endereço de entrega (opcional)">
              <input className={INPUT} value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Rua, número, bairro, cidade/UF" />
            </Field>
          </div>
        </Card>

        <Card title="Itens do orçamento">
          <Field label="Título do projeto (aparece no topo do PDF)" className="mb-5">
            <input className={INPUT} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Brindes personalizados para evento" />
          </Field>

          <div className="flex flex-col gap-4">
            {items.map((item, index) => {
              const lineTotal = (parsedItems[index]?.quantity ?? 0) * (parsedItems[index]?.unitPrice ?? 0);
              return (
                <div key={index} className="rounded-lg border border-mist p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-graphite">Item {index + 1}</span>
                    {items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                        className="flex items-center gap-1 text-xs text-graphite transition-colors hover:text-red-400"
                      >
                        <AdminIcon name="trash" className="h-3.5 w-3.5" /> Remover
                      </button>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-12">
                    <Field label="Do catálogo (opcional)" className="col-span-2 md:col-span-12">
                      <Select
                        value={item.productSlug}
                        onChange={(slug) => pickProduct(index, slug)}
                        placeholder="Item livre, sem produto do catálogo"
                        options={[{ value: "", label: "Item livre, sem produto do catálogo" }, ...products.map((p) => ({ value: p.slug, label: p.name }))]}
                        className="rounded-lg border border-mist bg-transparent px-3 py-2 text-sm focus:border-petrol"
                      />
                    </Field>
                    <Field label="Descrição *" className="col-span-2 md:col-span-6">
                      <input className={INPUT} value={item.description} onChange={(e) => updateItem(index, { description: e.target.value })} placeholder="O que será produzido" />
                    </Field>
                    <Field label="Detalhes (material, cor, medidas)" className="col-span-2 md:col-span-6">
                      <input className={INPUT} value={item.details} onChange={(e) => updateItem(index, { details: e.target.value })} placeholder="PLA preto · 12 cm" />
                    </Field>
                    <Field label="Quantidade" className="md:col-span-3">
                      <input className={INPUT} type="number" min={1} value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} inputMode="numeric" />
                    </Field>
                    <Field label="Valor unitário (R$)" className="md:col-span-4">
                      <input className={INPUT} value={item.unitPrice} onChange={(e) => updateItem(index, { unitPrice: e.target.value })} placeholder="0,00" inputMode="decimal" />
                    </Field>
                    <div className="col-span-2 flex flex-col justify-end md:col-span-5 md:items-end">
                      <span className="text-xs text-graphite">Total do item</span>
                      <span className="text-base font-semibold">{formatPrice(lineTotal)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, { description: "", details: "", quantity: "1", unitPrice: "", productSlug: "" }])}
            className="mt-4 flex items-center gap-1.5 rounded-lg border border-dashed border-mist px-4 py-2.5 text-sm text-graphite transition-colors hover:border-petrol hover:text-ink"
          >
            <AdminIcon name="plus" className="h-4 w-4" /> Adicionar item
          </button>
        </Card>

        <Card title="Prazo, pagamento e observações">
          <div className="grid grid-cols-1 gap-4">
            <Field label="Prazo de entrega">
              <input className={INPUT} value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} />
            </Field>
            <Field label="Condições de pagamento">
              <textarea className={`${INPUT} min-h-[84px]`} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} />
            </Field>
            <Field label="Observações">
              <textarea className={`${INPUT} min-h-[84px]`} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
          </div>
        </Card>
      </div>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <section className="admin-card rounded-xl border border-mist p-5">
          <h2 className="mb-4 text-sm font-semibold">Resumo</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-graphite">Subtotal</dt>
              <dd>{formatPrice(totals.subtotal)}</dd>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <dt className="text-graphite">Desconto</dt>
                <div className="flex overflow-hidden rounded-md border border-mist text-xs">
                  {(["valor", "pct"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setDiscountMode(mode)}
                      className={`px-2.5 py-1 ${discountMode === mode ? "bg-petrol font-semibold text-[#111]" : "text-graphite hover:text-ink"}`}
                    >
                      {mode === "valor" ? "R$" : "%"}
                    </button>
                  ))}
                </div>
              </div>
              <input className={INPUT} value={discountInput} onChange={(e) => setDiscountInput(e.target.value)} placeholder={discountMode === "pct" ? "0" : "0,00"} inputMode="decimal" aria-label="Desconto" />
              {totals.discount > 0 ? <p className="mt-1 text-right text-xs text-graphite">- {formatPrice(totals.discount)}</p> : null}
            </div>
            <div>
              <dt className="mb-1.5 text-graphite">Frete (R$)</dt>
              <input className={INPUT} value={shippingInput} onChange={(e) => setShippingInput(e.target.value)} placeholder="0,00 (retirada ou a combinar)" inputMode="decimal" aria-label="Frete" />
            </div>
            <div className="flex items-baseline justify-between border-t border-mist pt-3">
              <dt className="font-semibold">Total</dt>
              <dd className="text-xl font-semibold text-petrol">{formatPrice(totals.total)}</dd>
            </div>
          </dl>

          <div className="mt-5">
            <label className={LABEL}>Válido até</label>
            <input type="date" className={INPUT} value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>

          {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="mt-5 w-full rounded-lg bg-petrol px-4 py-3 text-sm font-semibold text-[#111] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Salvando…" : quoteId ? "Salvar alterações" : "Criar orçamento"}
          </button>
          <p className="mt-3 text-xs text-graphite">Depois de salvar você gera o PDF e envia ao cliente.</p>
        </section>
      </aside>
    </div>
  );
}
