"use client";

import { useState } from "react";
import { subscribeAction } from "@/app/actions/subscribe";

/** Captura de e-mail (com consentimento explícito) para novidades e ofertas. */
export function NewsletterForm({ source = "rodape" }: { source?: "rodape" | "home" }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ type: "idle" | "ok" | "error"; message?: string }>({ type: "idle" });
  const [sending, setSending] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    const result = await subscribeAction({ email, source });
    setSending(false);
    if (result.success) {
      setState({ type: "ok", message: result.message });
      setEmail("");
    } else {
      setState({ type: "error", message: result.error });
    }
  };

  return (
    <form onSubmit={submit} className="w-full max-w-md">
      <label htmlFor={`newsletter-${source}`} className="label-caps text-xs text-paper/70">
        Receba novidades e ofertas
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id={`newsletter-${source}`}
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu melhor e-mail"
          className="min-w-0 flex-1 border border-paper/25 bg-transparent px-4 py-3 text-base text-paper outline-none placeholder:text-paper/40 focus:border-petrol sm:text-sm"
        />
        <button
          type="submit"
          disabled={sending}
          className="label-caps shrink-0 rounded-full bg-petrol px-5 py-3 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
        >
          {sending ? "Enviando..." : "Quero"}
        </button>
      </div>
      {state.message ? (
        <p role="status" className={`mt-2 text-xs ${state.type === "ok" ? "text-petrol" : "text-red-400"}`}>
          {state.message}
        </p>
      ) : (
        <p className="mt-2 text-[11px] text-paper/50">Ao enviar, você aceita receber novidades por e-mail. Cancele quando quiser.</p>
      )}
    </form>
  );
}
