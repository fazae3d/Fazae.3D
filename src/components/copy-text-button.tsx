"use client";

import { useState } from "react";

/** Botão que copia um texto (chave Pix, "copia e cola") e avisa que copiou. */
export function CopyTextButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [state, setState] = useState<"idle" | "ok" | "error">("idle");

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setState("ok");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <button type="button" onClick={copy} className={className}>
      {state === "ok" ? "Copiado!" : state === "error" ? "Não consegui copiar" : label}
    </button>
  );
}
