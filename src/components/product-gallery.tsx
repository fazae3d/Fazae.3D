"use client";

import { useState } from "react";
import { ProductArt } from "./illustrations/product-art";
import type { Product } from "@/lib/types";

const VIEWS = ["Produto", "Detalhe", "Lifestyle", "Composição"];

export function ProductGallery({ product }: { product: Product }) {
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const images = product.images ?? [];
  const hasPhotos = images.length > 0;
  const slots = hasPhotos ? images : VIEWS;

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <div className="order-2 flex gap-3 overflow-x-auto sm:order-1 sm:flex-col">
        {slots.map((slot, i) => (
          <button
            key={slot}
            type="button"
            onClick={() => setActive(i)}
            className={`relative aspect-[4/5] w-20 shrink-0 overflow-hidden border transition-colors sm:w-24 ${
              active === i ? "border-petrol" : "border-paper/15"
            }`}
            aria-label={hasPhotos ? `Ver foto ${i + 1}` : `Ver ${VIEWS[i].toLowerCase()}`}
            aria-current={active === i}
          >
            {hasPhotos ? (
              <img src={slot} alt="" className="h-full w-full object-cover" />
            ) : (
              <ProductArt slug={product.slug} tone={product.imageTone} className="h-full w-full" />
            )}
          </button>
        ))}
      </div>
      <div className="order-1 flex-1 sm:order-2">
        <button
          type="button"
          disabled={!hasPhotos}
          onClick={() => setZoomOpen(true)}
          className={`relative block aspect-[4/5] w-full overflow-hidden bg-mist ${hasPhotos ? "cursor-zoom-in" : "cursor-default"}`}
          aria-label={hasPhotos ? "Ampliar foto do produto" : undefined}
        >
          {hasPhotos ? (
            <img src={images[active]} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <ProductArt slug={product.slug} tone={product.imageTone} className="h-full w-full" />
          )}
          {hasPhotos && (
            <span className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-paper/90 text-ink shadow">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
                <path d="M11 8v6M8 11h6" />
              </svg>
            </span>
          )}
        </button>
      </div>

      {zoomOpen && hasPhotos && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/95 p-4"
          onClick={() => setZoomOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`Foto ampliada de ${product.name}`}
        >
          <button
            type="button"
            onClick={() => setZoomOpen(false)}
            aria-label="Fechar foto ampliada"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-paper/10 text-paper transition-colors hover:bg-paper/20"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
          <img
            src={images[active]}
            alt={product.name}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
