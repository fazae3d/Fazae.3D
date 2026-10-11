"use client";

import { useState } from "react";
import { resendVerificationAction } from "@/app/actions/email-verification";

/** Aviso + botão para quem ainda não confirmou o e-mail (a conta só enxerga os pedidos depois disso). */
export function ResendVerification() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setState("sending");
    const result = await resendVerificationAction();
    if (result.success) {
      setState("sent");
      setMessage("Enviamos o link para o seu e-mail. Confira também o spam.");
    } else {
      setState("error");
      setMessage(result.error);
    }
  };

  return (
    <div className="border border-petrol/40 p-6">
      <p className="text-sm text-paper">Confirme seu e-mail para ver seus pedidos.</p>
      <p className="mt-1 text-xs text-graphite">
        Mandamos um link de confirmação quando você criou a conta. Isso protege o histórico dos seus pedidos.
      </p>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "sending" || state === "sent"}
        className="label-caps mt-4 rounded-full border border-petrol px-6 py-3 text-xs text-petrol transition-colors hover:bg-petrol hover:text-ink disabled:opacity-60"
      >
        {state === "sending" ? "Enviando..." : state === "sent" ? "Link enviado" : "Reenviar link de confirmação"}
      </button>
      {message && <p className={`mt-3 text-xs ${state === "error" ? "text-red-500" : "text-petrol"}`}>{message}</p>}
    </div>
  );
}
