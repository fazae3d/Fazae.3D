"use client";

import { useEffect } from "react";

export default function StorefrontError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="font-display text-3xl sm:text-4xl">Algo deu errado</h1>
      <p className="mt-4 text-graphite">
        Tivemos um problema para carregar esta página. Tente de novo; se continuar, fale com a gente pelo WhatsApp.
      </p>
      <button
        type="button"
        onClick={reset}
        className="label-caps mt-8 rounded-full bg-petrol px-8 py-4 text-xs text-ink transition-colors hover:bg-paper"
      >
        Tentar de novo
      </button>
    </div>
  );
}
