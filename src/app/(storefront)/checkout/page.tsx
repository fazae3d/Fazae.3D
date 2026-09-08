"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Breadcrumb } from "@/components/breadcrumb";
import { ButtonLink } from "@/components/button";
import { CheckoutStepsNav, type CheckoutStep } from "@/components/checkout/checkout-steps-nav";
import { OrderSummarySidebar } from "@/components/checkout/order-summary-sidebar";
import { StepIdentificacao } from "@/components/checkout/step-identificacao";
import { StepEndereco } from "@/components/checkout/step-endereco";
import { StepEntrega, type ShippingOption } from "@/components/checkout/step-entrega";
import { StepPagamento } from "@/components/checkout/step-pagamento";
import { StepConfirmacao } from "@/components/checkout/step-confirmacao";
import { useCart } from "@/contexts/cart-context";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { computeShippingCost } from "@/lib/shipping";
import type { AddressInput } from "@/lib/validation";
import type { Order, PaymentMethod } from "@/server/types";
import { createOrderAction } from "./actions";

export default function CheckoutPage() {
  const { lines, subtotal, coupon, discount, freeShippingFromCoupon, clearCart } = useCart();
  const { data: session } = useSession();
  const { settings } = useStoreSettings();

  const [step, setStep] = useState<CheckoutStep>("identificacao");
  const [guestEmail, setGuestEmail] = useState<string | null>(null);
  const [address, setAddress] = useState<AddressInput | null>(null);
  const [shipping, setShipping] = useState<ShippingOption | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Recomputed live (not just captured once on the "entrega" step) so a coupon
  // applied or removed afterward — the coupon form stays reachable from every
  // step's sidebar — is reflected immediately, instead of the displayed total
  // silently drifting from what createOrderAction ends up charging.
  const shippingCost = shipping
    ? freeShippingFromCoupon
      ? 0
      : computeShippingCost(shipping.key, subtotal, settings.freeShippingThreshold)
    : null;

  const handlePaid = async (method: PaymentMethod) => {
    if (!address || !shipping) return;

    setOrderError(null);
    const result = await createOrderAction({
      items: lines.map((l) => ({
        productSlug: l.productSlug,
        material: l.material,
        color: l.color,
        quantity: l.quantity,
      })),
      address,
      shippingMethod: shipping.key,
      paymentMethod: method,
      couponCode: coupon?.code,
      guestEmail: guestEmail ?? undefined,
    });

    if (!result.success) {
      setOrderError(result.error);
      return;
    }

    clearCart();
    setOrder(result.order);
    setStep("confirmacao");
  };

  if (lines.length === 0 && step !== "confirmacao") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="text-graphite">Seu carrinho está vazio. Adicione produtos antes de finalizar a compra.</p>
        <ButtonLink href="/loja" variant="primary" className="mt-6 inline-flex">
          Explorar loja
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb items={[{ label: "Início", href: "/" }, { label: "Checkout" }]} />
      <h1 className="font-display mb-8 text-3xl sm:text-4xl">Checkout</h1>
      <CheckoutStepsNav current={step} />

      {step === "confirmacao" && order ? (
        <StepConfirmacao order={order} isGuest={!session} />
      ) : (
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {step === "identificacao" && (
              <StepIdentificacao
                guestEmail={guestEmail}
                onNext={(email) => {
                  setGuestEmail(email);
                  setStep("endereco");
                }}
              />
            )}
            {step === "endereco" && (
              <StepEndereco
                defaultValues={address ?? undefined}
                onNext={(data) => {
                  setAddress(data);
                  setStep("entrega");
                }}
                onBack={() => setStep("identificacao")}
              />
            )}
            {step === "entrega" && (
              <StepEntrega
                subtotal={subtotal}
                freeShippingThreshold={settings.freeShippingThreshold}
                initial={shipping?.key}
                freeOverride={freeShippingFromCoupon}
                onNext={(option) => {
                  setShipping(option);
                  setStep("pagamento");
                }}
                onBack={() => setStep("endereco")}
              />
            )}
            {step === "pagamento" && shipping && (
              <>
                {orderError && <p className="mb-4 text-sm text-red-600">{orderError}</p>}
                <StepPagamento
                  total={Math.max(0, subtotal - discount) + (shippingCost ?? 0)}
                  onPaid={handlePaid}
                  onBack={() => setStep("entrega")}
                />
              </>
            )}
          </div>
          <OrderSummarySidebar lines={lines} shipping={shippingCost} />
        </div>
      )}
    </div>
  );
}
