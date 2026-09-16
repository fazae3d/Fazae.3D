"use client";

import { useEffect, useState } from "react";
import { getMyReviewAction, submitReviewAction } from "@/app/actions/reviews";
import type { Review } from "@/server/types";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" aria-label={`${rating} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className={i < rating ? "text-petrol" : "text-graphite/30"}>
          ★
        </span>
      ))}
    </div>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (rating: number) => void }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const star = i + 1;
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            aria-label={`${star} de 5 estrelas`}
            className={`text-xl leading-none transition-colors ${star <= value ? "text-petrol" : "text-graphite/30 hover:text-graphite"}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export function ReviewCta({
  orderId,
  productSlug,
  productName,
  guestEmail,
}: {
  orderId: string;
  productSlug: string;
  productName: string;
  /** Only needed for a guest (no session) tracking an order via /rastreamento. */
  guestEmail?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<Review | null>(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getMyReviewAction(orderId, productSlug).then((review) => {
      if (!alive) return;
      setExisting(review ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [orderId, productSlug]);

  const handleSubmit = async () => {
    if (rating < 1) {
      setError("Selecione uma nota.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const result = await submitReviewAction({ orderId, productSlug, rating, text, guestEmail });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setExisting(result.review);
    setOpen(false);
  };

  if (loading) return null;

  if (existing) {
    return (
      <div className="mt-2 border-t border-paper/15 pt-2 text-xs">
        <p className="mb-1 text-graphite">Sua avaliação de {productName}:</p>
        <Stars rating={existing.rating} />
        {existing.text && <p className="mt-1 text-graphite">&ldquo;{existing.text}&rdquo;</p>}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="label-caps mt-2 inline-block text-[11px] text-petrol hover:underline"
      >
        Avaliar {productName}
      </button>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-paper/15 pt-3 text-xs">
      <p className="text-graphite">Avaliar {productName}</p>
      <StarPicker value={rating} onChange={setRating} />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Conte como foi (opcional)"
        rows={2}
        className="border border-paper/15 bg-mist px-3 py-2 text-xs text-paper outline-none placeholder:text-paper/40 focus:border-petrol"
      />
      {error && <p className="text-red-500">{error}</p>}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="label-caps border border-petrol px-4 py-2 text-[11px] text-petrol transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
        >
          {submitting ? "Enviando..." : "Enviar avaliação"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="label-caps text-[11px] text-graphite hover:underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}
