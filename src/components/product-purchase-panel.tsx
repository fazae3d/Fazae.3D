"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/contexts/cart-context";
import { useWishlist } from "@/contexts/wishlist-context";
import { getDemoReviewStats } from "@/lib/reviews";
import { LOW_STOCK_THRESHOLD, isSoldOut } from "@/lib/badges";
import { formatPrice } from "@/lib/format";
import { pixPrice } from "@/lib/money";
import type { Product } from "@/lib/types";
import { ButtonLink } from "./button";
import { PriceBlock } from "./price-block";
import { QuantityStepper } from "./quantity-stepper";
import { SecurityBadge } from "./security-badge";
import { ShareButtons } from "./share-buttons";
import { ShippingEstimate } from "./shipping-estimate";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const stats = getDemoReviewStats(product.slug);

  const header = (
    <div>
      <Link
        href={`/categorias/${product.categorySlug}`}
        className="label-caps text-xs text-petrol hover:underline"
      >
        {product.categoryName}
      </Link>
      <h1 className="font-display mt-2 text-3xl sm:text-4xl">{product.name}</h1>
      <div className="mt-2 flex items-center justify-between gap-3">
        <a
          href="#avaliacoes"
          title="Nota de demonstração, ainda não há avaliações reais"
          className="inline-flex items-center gap-1.5 text-xs text-graphite hover:text-petrol"
        >
          <span className="text-petrol">★ {stats.average}</span>({stats.count} avaliações demo)
        </a>
        <ShareButtons productName={product.name} />
      </div>
    </div>
  );

  if (product.type === "sob_encomenda") {
    return (
      <div className="flex flex-col gap-6">
        {header}

        {product.price !== undefined ? (
          <PriceBlock price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
        ) : (
          <p className="text-2xl text-petrol">Sob consulta</p>
        )}

        {product.estimatedProductionDays && (
          <p className="border border-paper/15 p-4 text-sm text-graphite">
            Prazo estimado de produção: <strong className="text-paper">{product.estimatedProductionDays} dia(s)</strong> após a
            confirmação do orçamento.
          </p>
        )}

        <p className="text-sm text-graphite">
          Essa peça é feita sob encomenda, do seu jeito. Conte pra gente o material, a cor e os detalhes que você
          quer e a gente te manda um orçamento pelo WhatsApp.
        </p>

        <ButtonLink href={`/personalizado?ref=${product.slug}`} variant="primary" className="w-full text-center">
          Solicitar orçamento personalizado
        </ButtonLink>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-paper/15 pt-3 text-[11px] text-graphite">
          <SecurityBadge />
        </div>
      </div>
    );
  }

  return <ProntaEntregaPanel product={product} header={header} />;
}

function ProntaEntregaPanel({ product, header }: { product: Product; header: React.ReactNode }) {
  const { addLine } = useCart();
  const { has, toggle } = useWishlist();
  const router = useRouter();

  const [materialName, setMaterialName] = useState(product.materials[0]?.material ?? "");
  const currentMaterial = product.materials.find((m) => m.material === materialName) ?? product.materials[0];

  const [color, setColor] = useState(currentMaterial?.colors[0] ?? "");
  const [scale, setScale] = useState<string | null>(product.scaleOptions[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [buying, setBuying] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);

  const ctaRef = useRef<HTMLDivElement>(null);

  const soldOut = isSoldOut(product);
  const lowStock = !soldOut && product.stock <= LOW_STOCK_THRESHOLD;
  const canBuy = !soldOut && product.price !== undefined && currentMaterial;

  useEffect(() => {
    if (soldOut || !ctaRef.current) return;
    const el = ctaRef.current;
    const observer = new IntersectionObserver(([entry]) => setShowStickyBar(!entry.isIntersecting), {
      rootMargin: "0px 0px -40% 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [soldOut]);

  const handleMaterialChange = (nextMaterial: string) => {
    setMaterialName(nextMaterial);
    const option = product.materials.find((m) => m.material === nextMaterial);
    setColor(option?.colors[0] ?? "");
  };

  const buildLine = () => ({
    productSlug: product.slug,
    material: materialName,
    color,
    quantity,
  });

  const handleAddToCart = () => {
    if (!canBuy || added) return;
    addLine(buildLine());
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleBuyNow = () => {
    if (!canBuy || buying) return;
    setBuying(true);
    addLine(buildLine());
    router.push("/checkout");
  };

  return (
    <div className="flex flex-col gap-6">
      {header}

      {product.price !== undefined ? (
        <PriceBlock price={product.price} compareAtPrice={product.compareAtPrice} size="lg" />
      ) : (
        <p className="text-2xl text-petrol">Sob consulta</p>
      )}

      {product.price !== undefined && <ShippingEstimate price={product.price} quantity={quantity} />}

      {product.materials.length > 0 && (
        <div>
          <p className="label-caps mb-2 text-[11px] text-graphite">Material: {materialName}</p>
          <div className="flex flex-wrap gap-2">
            {product.materials.map((m) => (
              <button
                key={m.material}
                type="button"
                onClick={() => handleMaterialChange(m.material)}
                aria-pressed={materialName === m.material}
                className={`label-caps flex h-10 items-center justify-center border px-3 text-xs transition-colors ${
                  materialName === m.material ? "border-petrol bg-petrol text-ink" : "border-paper/15 text-paper hover:border-petrol"
                }`}
              >
                {m.material}
              </button>
            ))}
          </div>
        </div>
      )}

      {currentMaterial && currentMaterial.colors.length > 0 && (
        <div>
          <p className="label-caps mb-2 text-[11px] text-graphite">Cor: {color}</p>
          <div className="flex flex-wrap gap-2">
            {currentMaterial.colors.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-pressed={color === c}
                className={`label-caps flex h-10 items-center justify-center border px-3 text-xs transition-colors ${
                  color === c ? "border-petrol bg-petrol text-ink" : "border-paper/15 text-paper hover:border-petrol"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {product.scaleOptions.length > 0 && (
        <div>
          <p className="label-caps mb-2 text-[11px] text-graphite">Escala</p>
          <div className="flex flex-wrap gap-2">
            {product.scaleOptions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScale(s)}
                aria-pressed={scale === s}
                className={`label-caps flex h-10 min-w-10 items-center justify-center border px-3 text-xs transition-colors ${
                  scale === s ? "border-petrol bg-petrol text-ink" : "border-paper/15 text-paper hover:border-petrol"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <QuantityStepper value={quantity} onChange={setQuantity} max={soldOut ? 1 : product.stock} />
        {soldOut ? (
          <p className="text-xs text-graphite">Esgotado</p>
        ) : quantity >= product.stock ? (
          <p className="text-xs text-sand">Máximo em estoque: {product.stock}</p>
        ) : lowStock ? (
          <p className="text-xs text-sand">Últimas {product.stock} peças</p>
        ) : (
          <p className="text-xs text-petrol">Disponível em estoque</p>
        )}
      </div>

      <div ref={ctaRef} className="flex flex-col gap-3">
        {soldOut ? (
          <p className="border border-paper/15 p-4 text-sm text-graphite">
            Este produto está esgotado. Adicione aos favoritos para saber quando chegar novamente.
          </p>
        ) : !canBuy ? (
          <ButtonLink href={`/personalizado?ref=${product.slug}`} variant="primary" className="w-full text-center">
            Solicitar orçamento
          </ButtonLink>
        ) : (
          <>
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={added}
              className="label-caps flex items-center justify-center gap-2 rounded-full bg-petrol py-4 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-80"
            >
              {added ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12l5 5L20 6" />
                  </svg>
                  Adicionado ao carrinho
                </>
              ) : (
                "Adicionar ao carrinho"
              )}
            </button>
            <button
              type="button"
              onClick={handleBuyNow}
              disabled={buying}
              className="label-caps rounded-full border border-paper/25 py-4 text-xs text-paper transition-colors hover:border-petrol hover:text-petrol disabled:opacity-60"
            >
              {buying ? "Redirecionando..." : "Comprar agora"}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => toggle(product.slug)}
          className="label-caps flex items-center justify-center gap-2 py-2 text-xs text-graphite transition-colors hover:text-petrol"
        >
          <span>{has(product.slug) ? "♥" : "♡"}</span>
          {has(product.slug) ? "Adicionado aos favoritos" : "Adicionar aos favoritos"}
        </button>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-paper/15 pt-3 text-[11px] text-graphite">
          <SecurityBadge />
          <span>Troca ou devolução grátis em até 7 dias</span>
        </div>
      </div>

      {showStickyBar && !soldOut && canBuy && product.price !== undefined && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-paper/15 bg-ink/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[0_-4px_16px_rgba(0,0,0,0.4)] backdrop-blur-sm lg:hidden">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-graphite">{product.name}</p>
            <p className="text-sm text-petrol">{formatPrice(pixPrice(product.price))} no Pix</p>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={added}
            className="label-caps shrink-0 rounded-full bg-petrol px-5 py-3 text-[11px] text-ink transition-colors hover:bg-paper disabled:opacity-80"
          >
            {added ? "Adicionado ✓" : "Adicionar"}
          </button>
        </div>
      )}
    </div>
  );
}
