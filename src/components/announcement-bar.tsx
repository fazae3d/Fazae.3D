"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/contexts/cart-context";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { formatPrice } from "@/lib/format";
import { formatPct } from "@/lib/money";
import { usePixDiscountPct } from "@/contexts/pix-discount-context";
import { getLocalDeliveryRules } from "@/lib/local-delivery";
import { useStoreRules } from "@/contexts/store-rules-context";

export function AnnouncementBar() {
  const { subtotal } = useCart();
  const { settings } = useStoreSettings();
  const rules = useStoreRules();
  const [index, setIndex] = useState(0);

  const remaining = Math.max(0, settings.freeShippingThreshold - subtotal);
  const progress = Math.min(100, (subtotal / settings.freeShippingThreshold) * 100);
  const shippingMessage =
    remaining > 0
      ? `Faltam ${formatPrice(remaining)} para você ganhar frete grátis`
      : "Você garantiu frete grátis 🎉";

  const localCities = getLocalDeliveryRules({ ...settings, rules }).citiesLabel;
  const remainingLocal = Math.max(0, getLocalDeliveryRules({ ...settings, rules }).threshold - subtotal);
  const localMessage =
    remainingLocal > 0
      ? `${localCities}: faltam ${formatPrice(remainingLocal)} para frete grátis`
      : `${localCities}: você garantiu frete grátis 🎉`;

  const pixPct = usePixDiscountPct();
  const { welcomeCouponCode, welcomeCouponText, installments } = rules.payments;
  const messages = [
    welcomeCouponCode ? `Ganhe ${welcomeCouponText || "desconto"} com o cupom ${welcomeCouponCode}` : null,
    `${formatPct(pixPct)}% de desconto pagando no Pix`,
    installments > 1 ? `Parcele em até ${installments}x sem juros` : null,
    shippingMessage,
    localMessage,
  ].filter((m): m is string => Boolean(m));

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % messages.length);
    }, 4000);
    return () => clearInterval(id);
  }, [messages.length]);

  return (
    <div className="relative w-full overflow-hidden bg-ink">
      <div className="mx-auto flex h-8 max-w-7xl items-center justify-center px-4 sm:px-6 lg:px-8">
        <p key={index} className="label-caps animate-fade-in text-center text-[10px] text-paper sm:text-[11px]">
          {messages[index]}
        </p>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-paper/10">
        <div className="h-full bg-petrol transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
