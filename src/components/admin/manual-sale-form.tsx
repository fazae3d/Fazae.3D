"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createManualSaleAction } from "@/app/admin/vendas/actions";
import { Select } from "@/components/select";
import { formatPrice } from "@/lib/format";
import { CHANNEL_LABELS, computeChannelFee, isMarketplace, type ChannelFees } from "@/lib/channels";
import { round2 } from "@/lib/money";
import { CUSTOMER_SOURCES, customerSourceLabel } from "@/lib/customer-source";
import { phoneKey } from "@/lib/customer-insights";
import { normalizePhone } from "@/lib/whatsapp";
import type { Material, Product } from "@/lib/types";
import type { OrderStatus, PaymentMethod } from "@/server/types";

type ManualSaleChannel = "presencial" | "whatsapp" | "mercado_livre" | "shopee" | "tiktok_shop";

const SALE_CHANNELS: ManualSaleChannel[] = ["presencial", "whatsapp", "mercado_livre", "shopee", "tiktok_shop"];

type SaleItem = {
  /** true = produto manual (fora da loja): usa customName e os materiais/cores cadastrados em Materiais. */
  manual: boolean;
  customName: string;
  productSlug: string;
  material: string;
  color: string;
  quantity: number;
  price: number;
};

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "pix", label: "PIX" },
  { value: "cartao", label: "Cartão" },
  { value: "boleto", label: "Boleto" },
];

export const STATUSES: OrderStatus[] = [
  "Pedido recebido",
  "Pagamento aprovado",
  "Em preparação",
  "Enviado",
  "Em trânsito",
  "Entregue",
  "Cancelado",
];

function labelClass() {
  return "label-caps text-[11px] text-graphite";
}

function inputClass(hasError?: boolean) {
  return `border px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm ${hasError ? "border-red-500" : "border-mist"}`;
}

function emptyItem(products: Product[], manual = false): SaleItem {
  if (manual || products.length === 0) {
    return { manual: true, customName: "", productSlug: "", material: "", color: "", quantity: 1, price: 0 };
  }
  const first = products[0];
  const firstMaterial = first?.materials[0];
  return {
    manual: false,
    customName: "",
    productSlug: first?.slug ?? "",
    material: firstMaterial?.material ?? "",
    color: firstMaterial?.colors[0] ?? "",
    quantity: 1,
    price: first?.price ?? 0,
  };
}

export type KnownCustomer = { name: string; phone: string; source?: string };

export function ManualSaleForm({
  products,
  materials = [],
  channelFees = {},
  customers = [],
}: {
  products: Product[];
  /** Clientes já cadastrados: o telefone ou o nome digitado reconhece quem já comprou. */
  customers?: KnownCustomer[];
  /** Materiais cadastrados (com cores): alimentam os campos do produto manual. */
  materials?: Material[];
  channelFees?: ChannelFees;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<ManualSaleChannel>("presencial");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerSource, setCustomerSource] = useState("");
  const [phoneSkipped, setPhoneSkipped] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [status, setStatus] = useState<OrderStatus>("Entregue");
  const [productionPending, setProductionPending] = useState(false);
  const [items, setItems] = useState<SaleItem[]>([emptyItem(products)]);
  // Taxa do marketplace: sugerida pelas Configurações, mas pode ser ajustada (a real muda por anúncio).
  const [feeOverride, setFeeOverride] = useState<string | null>(null);
  const [shippingInput, setShippingInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const productBySlug = (slug: string) => products.find((p) => p.slug === slug);

  // Cadastro rápido: o telefone (em qualquer formato) reconhece o cliente que já comprou; o nome também sugere quem já existe.
  const typedPhoneKey = phoneKey(customerPhone);
  const phoneValid = normalizePhone(customerPhone) !== null;
  const knownByPhone = phoneValid ? customers.find((c) => phoneKey(c.phone) === typedPhoneKey) : undefined;
  const needsPhone = channel === "presencial" || channel === "whatsapp";

  const handlePhoneChange = (value: string) => {
    setCustomerPhone(value);
    const match = normalizePhone(value) ? customers.find((c) => phoneKey(c.phone) === phoneKey(value)) : undefined;
    // Cliente já cadastrado: completa o nome, sem apagar o que a pessoa já digitou.
    if (match && !customerName.trim()) setCustomerName(match.name);
  };

  const handleNameChange = (value: string) => {
    setCustomerName(value);
    const match = customers.find((c) => c.name.trim().toLowerCase() === value.trim().toLowerCase());
    if (match && !customerPhone.trim()) setCustomerPhone(match.phone);
  };

  const updateItem = (index: number, patch: Partial<SaleItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleProductChange = (index: number, slug: string) => {
    const product = productBySlug(slug);
    const firstMaterial = product?.materials[0];
    updateItem(index, {
      productSlug: slug,
      material: firstMaterial?.material ?? "",
      color: firstMaterial?.colors[0] ?? "",
      price: product?.price ?? 0,
    });
  };

  const handleMaterialChange = (index: number, slug: string, materialName: string) => {
    const product = productBySlug(slug);
    const option = product?.materials.find((m) => m.material === materialName);
    updateItem(index, { material: materialName, color: option?.colors[0] ?? "" });
  };

  const addItem = (manual = false) => setItems((prev) => [...prev, emptyItem(products, manual)]);

  // Troca o item entre "da loja" e "manual"; no manual a lista de cores segue o material escolhido.
  const setItemKind = (index: number, manual: boolean) => {
    const fresh = emptyItem(products, manual);
    updateItem(index, { ...fresh, quantity: items[index].quantity });
    if (manual) setProductionPending(true);
  };
  const colorsOfMaterial = (name: string) => materials.find((m) => m.name === name)?.colors.map((c) => c.name) ?? [];
  const parseMoney = (value: string) => {
    const text = value.trim();
    if (!text) return 0;
    const n = Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };
  const removeItem = (index: number) => setItems((prev) => prev.filter((_, i) => i !== index));

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingCost = parseMoney(shippingInput);
  const units = items.reduce((sum, item) => sum + item.quantity, 0);
  const marketplace = isMarketplace(channel);
  const suggestedFee = marketplace ? computeChannelFee(channelFees[channel], subtotal, units) : 0;
  const parsedOverride = feeOverride === null ? null : Number(feeOverride.replace(",", "."));
  const channelFee = marketplace ? (parsedOverride !== null && Number.isFinite(parsedOverride) ? Math.max(0, parsedOverride) : suggestedFee) : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }
    if (customerPhone.trim() && !phoneValid) {
      setError("Telefone inválido. Use o DDD e o número, por exemplo 84 99999-8888.");
      return;
    }
    if (needsPhone && !phoneValid && !phoneSkipped) {
      setError("Informe o telefone do cliente ou marque que ele não quis informar.");
      return;
    }
    if (items.some((item) => !item.manual && (!item.productSlug || !item.material || !item.color))) {
      setError("Selecione produto, material e cor em todos os itens da loja.");
      return;
    }
    if (items.some((item) => item.manual && !item.customName.trim())) {
      setError("Digite o nome de cada produto manual.");
      return;
    }

    setSubmitting(true);
    const result = await createManualSaleAction({
      channel,
      channelFee: marketplace ? round2(channelFee) : undefined,
      customerName: customerName.trim(),
      customerPhone: phoneSkipped ? undefined : customerPhone.trim() || undefined,
      customerSource: !knownByPhone && customerSource ? customerSource : undefined,
      customerPhoneSkipped: phoneSkipped || undefined,
      paymentMethod,
      status,
      productionPending,
      shipping: shippingCost > 0 ? shippingCost : undefined,
      items: items.map((item) => ({
        productSlug: item.manual ? undefined : item.productSlug,
        customName: item.manual ? item.customName.trim() : undefined,
        material: item.material || undefined,
        color: item.color || undefined,
        quantity: item.quantity,
        price: item.price,
      })),
    });
    setSubmitting(false);

    if (!result.success) {
      setError(result.error);
      return;
    }
    router.push("/admin/pedidos");
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div>
        <p className={labelClass() + " mb-2"}>Canal da venda</p>
        <div className="flex flex-wrap gap-2">
          {SALE_CHANNELS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setChannel(c);
                setFeeOverride(null);
              }}
              className={`label-caps border px-4 py-2.5 text-[11px] transition-colors ${
                channel === c ? "border-ink bg-ink text-paper" : "border-mist text-graphite hover:border-ink"
              }`}
            >
              {CHANNEL_LABELS[c]}
            </button>
          ))}
        </div>
        {marketplace && (
          <p className="mt-2 text-xs text-graphite">
            Venda de marketplace: o valor da taxa do canal é descontado do lucro. Configure comissão e taxa fixa em Configurações.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="customerPhone">
            Telefone do cliente{needsPhone ? "" : " (opcional)"}
          </label>
          <input
            id="customerPhone"
            value={customerPhone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            inputMode="tel"
            placeholder="(84) 99999-8888"
            disabled={phoneSkipped}
            className={inputClass(Boolean(customerPhone.trim()) && !phoneValid) + " disabled:opacity-50"}
          />
          {knownByPhone ? (
            <p className="text-xs text-petrol">
              Cliente já cadastrado: {knownByPhone.name}
              {knownByPhone.source ? ` (veio de ${customerSourceLabel(knownByPhone.source)})` : ""}.
            </p>
          ) : customerPhone.trim() && !phoneValid ? (
            <p className="text-xs text-red-500">Use o DDD e o número, por exemplo 84 99999-8888.</p>
          ) : phoneValid ? (
            <p className="text-xs text-graphite">Cliente novo: ele será cadastrado ao salvar a venda.</p>
          ) : (
            <p className="text-xs text-graphite">É com o telefone que o sistema reconhece quem já comprou e avisa de novas peças.</p>
          )}
          {needsPhone ? (
            <label className="mt-1 flex items-center gap-2 text-xs text-graphite">
              <input
                type="checkbox"
                checked={phoneSkipped}
                onChange={(e) => {
                  setPhoneSkipped(e.target.checked);
                  if (e.target.checked) setCustomerPhone("");
                }}
                className="h-3.5 w-3.5 accent-ink"
              />
              O cliente não quis informar o telefone
            </label>
          ) : null}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="customerName">
            Nome do cliente
          </label>
          <input
            id="customerName"
            list="known-customers"
            value={customerName}
            onChange={(e) => handleNameChange(e.target.value)}
            autoComplete="off"
            className={inputClass()}
          />
          <datalist id="known-customers">
            {customers.map((c) => (
              <option key={c.phone} value={c.name} />
            ))}
          </datalist>
        </div>
        {!knownByPhone && phoneValid && !phoneSkipped ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2 sm:max-w-sm">
            <label className={labelClass()} htmlFor="customerSource">
              Como nos conheceu (opcional)
            </label>
            <Select
              id="customerSource"
              value={customerSource}
              onChange={setCustomerSource}
              className={inputClass()}
              placeholder="Não informado"
              options={[{ value: "", label: "Não informado" }, ...CUSTOMER_SOURCES]}
            />
            <p className="text-xs text-graphite">Mostra qual canal traz clientes de verdade (Instagram, indicação, feira...).</p>
          </div>
        ) : null}
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

      <div className="flex flex-wrap items-end gap-6">
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <label className={labelClass()} htmlFor="status">
            Status do pedido
          </label>
          <Select
            id="status"
            value={status}
            onChange={(v) => setStatus(v as OrderStatus)}
            className={inputClass()}
            options={STATUSES.map((s) => ({ value: s, label: s }))}
          />
        </div>
        <label className="flex items-center gap-2 pb-2.5 text-sm">
          <input
            type="checkbox"
            checked={productionPending}
            onChange={(e) => setProductionPending(e.target.checked)}
            className="h-4 w-4 accent-ink"
          />
          Produção pendente
        </label>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className={labelClass()}>Produtos vendidos</p>
          <div className="flex gap-4">
            <button type="button" onClick={() => addItem(false)} disabled={products.length === 0} className="label-caps text-[11px] text-petrol hover:underline disabled:opacity-40">
              + produto da loja
            </button>
            <button type="button" onClick={() => addItem(true)} className="label-caps text-[11px] text-petrol hover:underline">
              + produto manual
            </button>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {items.map((item, index) => {
            const product = productBySlug(item.productSlug);
            return (
              <div key={index} className="border border-mist p-3">
                <div className="mb-2 flex gap-2 text-xs">
                  {([false, true] as const).map((manual) => (
                    <button
                      key={String(manual)}
                      type="button"
                      onClick={() => item.manual !== manual && setItemKind(index, manual)}
                      disabled={!manual && products.length === 0}
                      className={`rounded-full border px-3 py-1 transition-colors ${
                        item.manual === manual ? "admin-chip-active" : "border-mist text-graphite hover:border-petrol hover:text-ink"
                      }`}
                    >
                      {manual ? "Produto manual" : "Da loja"}
                    </button>
                  ))}
                </div>
                {item.manual ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr]">
                    <input
                      value={item.customName}
                      onChange={(e) => updateItem(index, { customName: e.target.value })}
                      placeholder="Nome do produto (ex.: Chaveiro com nome)"
                      className={inputClass()}
                    />
                    <Select
                      value={item.material}
                      onChange={(v) => updateItem(index, { material: v, color: "" })}
                      className={inputClass()}
                      placeholder="Material (opcional)"
                      options={materials.map((m) => ({ value: m.name, label: m.name }))}
                    />
                    <Select
                      value={item.color}
                      onChange={(v) => updateItem(index, { color: v })}
                      className={inputClass()}
                      placeholder="Cor (opcional)"
                      options={colorsOfMaterial(item.material).map((c) => ({ value: c, label: c }))}
                    />
                  </div>
                ) : (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr]">
                  <Select
                    value={item.productSlug}
                    onChange={(v) => handleProductChange(index, v)}
                    className={inputClass()}
                    options={products.map((p) => ({
                      value: p.slug,
                      label: `${p.name} (${p.price !== undefined ? formatPrice(p.price) : "sob consulta"}) · ${p.stock} un.`,
                    }))}
                  />
                  <Select
                    value={item.material}
                    onChange={(v) => handleMaterialChange(index, item.productSlug, v)}
                    className={inputClass()}
                    options={(product?.materials ?? []).map((m) => ({ value: m.material, label: m.material }))}
                  />
                  <Select
                    value={item.color}
                    onChange={(v) => updateItem(index, { color: v })}
                    className={inputClass()}
                    options={(
                      product?.materials.find((m) => m.material === item.material)?.colors ?? []
                    ).map((c) => ({ value: c, label: c }))}
                  />
                </div>
                )}
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="label-caps text-[10px] text-graphite">Qtd</span>
                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                      className={`w-20 ${inputClass()}`}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="label-caps text-[10px] text-graphite">Preço unit. (R$)</span>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={item.price}
                      onChange={(e) => updateItem(index, { price: Math.max(0, Number(e.target.value) || 0) })}
                      className={`w-28 ${inputClass()}`}
                    />
                  </div>
                  <span className="ml-auto text-sm text-graphite">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length <= 1}
                    className="label-caps px-2 text-[11px] text-graphite hover:text-red-600 disabled:opacity-30"
                  >
                    remover
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {marketplace && (
        <div className="flex flex-wrap items-end gap-4 border border-mist p-4">
          <div className="flex flex-col gap-1.5">
            <label className={labelClass()} htmlFor="channelFee">
              Taxa do {CHANNEL_LABELS[channel]} (R$)
            </label>
            <input
              id="channelFee"
              inputMode="decimal"
              value={feeOverride ?? String(suggestedFee).replace(".", ",")}
              onChange={(e) => setFeeOverride(e.target.value)}
              className={`w-36 ${inputClass()}`}
            />
          </div>
          <p className="pb-2 text-sm text-graphite">Você recebe {formatPrice(Math.max(0, round2(subtotal - channelFee)))}</p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 border-t border-mist pt-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="shipping">
            Frete cobrado (R$)
          </label>
          <input
            id="shipping"
            inputMode="decimal"
            value={shippingInput}
            onChange={(e) => setShippingInput(e.target.value)}
            placeholder="em branco = sem frete"
            className={`w-48 ${inputClass()}`}
          />
        </div>
        <div className="ml-auto text-right">
          {shippingCost > 0 ? (
            <p className="text-xs text-graphite">
              Produtos {formatPrice(subtotal)} + frete {formatPrice(shippingCost)}
            </p>
          ) : null}
          <p className="label-caps text-[11px] text-graphite">Total</p>
          <p className="font-display text-xl">{formatPrice(subtotal + shippingCost)}</p>
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="label-caps bg-ink px-8 py-4 text-xs text-paper transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {submitting ? "Registrando..." : "Registrar venda"}
        </button>
      </div>
    </form>
  );
}
