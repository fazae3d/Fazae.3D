import { formatInstallments, formatPrice } from "@/lib/format";
import { pixPrice, PIX_DISCOUNT } from "@/lib/money";

/**
 * The Pix-discounted price is the headline number across the store — matches
 * how most BR streetwear/e-commerce sites price-anchor on Pix since it's the
 * cheapest way to pay. `price` (card/boleto) and `compareAtPrice` (pre-sale)
 * both show smaller, underneath.
 */
export function PriceBlock({
  price,
  compareAtPrice,
  size = "lg",
}: {
  price: number;
  compareAtPrice?: number;
  size?: "sm" | "lg";
}) {
  const pix = pixPrice(price);

  if (size === "sm") {
    return (
      <div className="space-y-0.5">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-semibold text-petrol">{formatPrice(pix)}</span>
          <span className="label-caps text-[9px] text-petrol/70">no pix</span>
        </div>
        <div className="flex items-baseline gap-2 text-xs text-graphite">
          <span>{formatPrice(price)}</span>
          {compareAtPrice && <span className="line-through">{formatPrice(compareAtPrice)}</span>}
        </div>
        <p className="text-xs text-graphite">{formatInstallments(price)}</p>
      </div>
    );
  }

  return (
    <div>
      {compareAtPrice && (
        <p className="text-xs text-graphite line-through">{formatPrice(compareAtPrice)}</p>
      )}
      <div className="flex items-baseline gap-3">
        <span className="text-3xl text-petrol sm:text-4xl">{formatPrice(pix)}</span>
        <span className="label-caps text-xs text-petrol/70">
          no Pix ({Math.round(PIX_DISCOUNT * 100)}% off)
        </span>
      </div>
      <p className="mt-1 text-sm text-graphite">{formatPrice(price)} no cartão ou boleto</p>
      <p className="text-sm text-graphite">{formatInstallments(price)}</p>
    </div>
  );
}
