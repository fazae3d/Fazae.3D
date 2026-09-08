"use client";

import Link from "next/link";
import { Breadcrumb } from "@/components/breadcrumb";
import { ButtonLink } from "@/components/button";
import { CartCrossSell } from "@/components/cart-cross-sell";
import { CouponForm } from "@/components/coupon-form";
import { QuantityStepper } from "@/components/quantity-stepper";
import { ProductThumb } from "@/components/product-thumb";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";
import { computeShippingCost } from "@/lib/shipping";

export default function CarrinhoPage() {
  const { lines, removeLine, updateQuantity, subtotal, discount, freeShippingFromCoupon, getCartProduct } =
    useCart();
  const { toggle } = useWishlist();
  const { settings } = useStoreSettings();

  const remaining = round2(Math.max(0, settings.freeShippingThreshold - subtotal));
  const shipping =
    subtotal > 0 ? (freeShippingFromCoupon ? 0 : computeShippingCost("padrao", subtotal, settings.freeShippingThreshold)) : 0;
  const total = round2(Math.max(0, subtotal - discount) + shipping);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Carrinho" }]} />
      <h1 className="font-display mb-10 text-3xl sm:text-4xl">Seu carrinho</h1>

      {lines.length === 0 ? (
        <div className="border border-paper/15 px-6 py-20 text-center">
          <p className="text-graphite">Seu carrinho está vazio.</p>
          <ButtonLink href="/loja" variant="primary" className="mt-6 inline-flex">
            Explorar loja
          </ButtonLink>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
          <ul className="divide-y divide-paper/15 lg:col-span-2">
            {lines.map((line) => {
              const product = getCartProduct(line.productSlug);
              if (!product || product.price === undefined) return null;
              return (
                <li key={`${line.productSlug}-${line.material}-${line.color}`} className="flex gap-5 py-6">
                  <Link href={`/produto/${product.slug}`} className="block h-32 w-28 shrink-0 overflow-hidden">
                    <ProductThumb product={product} color={line.color} className="h-full w-full" />
                  </Link>
                  <div className="flex flex-1 flex-col gap-1.5">
                    <p className="label-caps text-[10px] text-graphite">{product.categoryName}</p>
                    <Link href={`/produto/${product.slug}`} className="text-sm hover:text-petrol">
                      {product.name}
                    </Link>
                    <p className="text-xs text-graphite">
                      {line.material} · {line.color}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                      <QuantityStepper
                        value={line.quantity}
                        onChange={(q) => updateQuantity(line.productSlug, line.material, line.color, q)}
                        max={product.stock}
                      />
                      <span className="text-sm font-medium">{formatPrice(product.price * line.quantity)}</span>
                    </div>
                    <div className="mt-1 flex gap-4">
                      <button
                        className="label-caps text-[11px] text-graphite hover:text-petrol hover:underline"
                        onClick={() => removeLine(line.productSlug, line.material, line.color)}
                      >
                        Remover
                      </button>
                      <button
                        className="label-caps text-[11px] text-graphite hover:text-petrol hover:underline"
                        onClick={() => toggle(line.productSlug)}
                      >
                        Favoritar
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="h-fit space-y-5">
            <CouponForm />

            <div className="border border-paper/15 p-6">
              <p className="label-caps mb-4 text-xs text-graphite">Resumo do pedido</p>
              {freeShippingFromCoupon ? (
                <p className="mb-4 text-xs text-petrol">Frete grátis aplicado pelo cupom 🎉</p>
              ) : remaining > 0 ? (
                <p className="mb-4 text-xs text-graphite">
                  Você está a <strong className="text-paper">{formatPrice(remaining)}</strong> do frete grátis.
                </p>
              ) : (
                <p className="mb-4 text-xs text-petrol">Você garantiu frete grátis 🎉</p>
              )}
              <div className="space-y-2 border-b border-paper/15 pb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-graphite">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-graphite">Frete</span>
                  <span>{shipping === 0 ? "Grátis" : formatPrice(shipping)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-graphite">Desconto</span>
                  <span>{discount > 0 ? `-${formatPrice(discount)}` : formatPrice(0)}</span>
                </div>
              </div>
              <div className="flex justify-between py-4 text-base font-medium">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
              <ButtonLink href="/checkout" variant="primary" className="w-full">
                Ir para o checkout
              </ButtonLink>
            </div>
          </div>
        </div>
      )}

      {lines.length > 0 && (
        <div className="mt-14 border-t border-paper/15 pt-10">
          <CartCrossSell limit={4} />
        </div>
      )}
    </div>
  );
}
