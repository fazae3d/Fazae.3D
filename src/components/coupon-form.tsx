"use client";

import { useState } from "react";
import { applyCouponAction } from "@/app/(storefront)/carrinho/actions";
import { useCart } from "@/contexts/cart-context";
import { formatPrice } from "@/lib/format";

export function CouponForm() {
  const { coupon, subtotal, discount, applyCoupon, removeCoupon } = useCart();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setMessage(null);
    // Always clears the loading state, even if the action itself throws —
    // without this, an unexpected error left the button disabled forever.
    try {
      const result = await applyCouponAction(code.trim(), subtotal);
      if (!result.valid) {
        setMessage(result.message);
        return;
      }
      applyCoupon({ code: result.code, type: result.type, value: result.value });
      setCode("");
    } catch {
      setMessage("Não foi possível aplicar o cupom agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (coupon) {
    return (
      <div className="flex items-center justify-between border border-petrol/40 bg-petrol/10 px-4 py-3 text-sm">
        <div>
          <p className="text-paper">
            Cupom <strong>{coupon.code}</strong> aplicado
          </p>
          {discount > 0 && <p className="text-xs text-petrol">-{formatPrice(discount)}</p>}
          {coupon.type === "frete-gratis" && <p className="text-xs text-petrol">Frete grátis</p>}
        </div>
        <button
          type="button"
          onClick={removeCoupon}
          className="label-caps text-[11px] text-graphite hover:text-petrol hover:underline"
        >
          Remover
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Cupom de desconto"
          className="flex-1 border border-paper/15 bg-mist px-3 py-2.5 text-sm text-paper outline-none placeholder:text-paper/40 focus:border-petrol"
        />
        <button
          type="button"
          onClick={handleApply}
          disabled={loading}
          className="label-caps flex items-center justify-center gap-2 border border-petrol px-4 py-2.5 text-xs text-petrol transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {loading && (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="animate-spin">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.25" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          )}
          Aplicar
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-red-600">{message}</p>}
    </div>
  );
}
