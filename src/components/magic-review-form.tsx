"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { submitMagicReviewAction } from "@/app/actions/reviews";

/** Uma avaliação (estrelas + comentário) de um produto do pedido, aberta pelo link do e-mail ou do WhatsApp. */
export function MagicReviewForm({ orderId, token, productSlug }: { orderId: string; token: string; productSlug: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (rating < 1) {
      setError("Escolha de 1 a 5 estrelas.");
      return;
    }
    setError(null);
    setSubmitting(true);
    const result = await submitMagicReviewAction({ orderId, token, productSlug, rating, text });
    setSubmitting(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="mt-4">
      <div className="flex gap-1" role="radiogroup" aria-label="Nota de 1 a 5 estrelas">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={rating === star}
            aria-label={`${star} de 5 estrelas`}
            onClick={() => setRating(star)}
            className={`text-3xl leading-none transition-colors ${star <= rating ? "text-petrol" : "text-graphite/40 hover:text-graphite"}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Conta pra gente o que achou (opcional)"
        className="mt-3 w-full border border-paper/20 bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
      />
      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
      <button
        type="button"
        onClick={submit}
        disabled={submitting}
        className="label-caps mt-3 rounded-full bg-petrol px-6 py-3 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
      >
        {submitting ? "Enviando..." : "Enviar avaliação"}
      </button>
    </div>
  );
}
