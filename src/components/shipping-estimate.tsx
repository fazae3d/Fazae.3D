"use client";

import { useCart } from "@/contexts/cart-context";
import { useStoreSettings } from "@/hooks/use-store-settings";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";
import { SHIPPING_OPTIONS } from "@/lib/shipping";

/** Shown on the PDP — the point where the purchase decision actually happens, not just at cart/checkout. */
export function ShippingEstimate({ price, quantity }: { price: number; quantity: number }) {
  const { subtotal } = useCart();
  const { settings } = useStoreSettings();
  const potentialSubtotal = round2(subtotal + price * quantity);
  const remaining = round2(Math.max(0, settings.freeShippingThreshold - potentialSubtotal));

  return (
    <div className="border border-paper/15 p-4 text-xs text-graphite">
      <div className="flex items-start gap-2.5">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mt-0.5 shrink-0 text-petrol"
        >
          <path d="M3 7h11v9H3z" />
          <path d="M14 10h4l3 3v3h-7z" />
          <circle cx="7.5" cy="18" r="1.6" />
          <circle cx="17.5" cy="18" r="1.6" />
        </svg>
        <div>
          {remaining > 0 ? (
            <p>
              Faltam <strong className="text-paper">{formatPrice(remaining)}</strong> para o frete grátis
            </p>
          ) : (
            <p className="text-petrol">Este item já garante frete grátis 🎉</p>
          )}
          <ul className="mt-1.5 space-y-0.5">
            {SHIPPING_OPTIONS.map((option) => (
              <li key={option.key}>
                {option.label}: {option.eta}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
