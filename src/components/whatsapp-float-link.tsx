"use client";

import type { ReactNode } from "react";
import { trackEvent } from "@/lib/analytics";

/** Botão flutuante de WhatsApp que também registra o clique no Google Analytics. */
export function WhatsAppFloatLink({ href, className, children }: { href: string; className: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Falar no WhatsApp"
      title="Falar no WhatsApp"
      className={className}
      onClick={() => trackEvent("click_whatsapp", { location: "botao_flutuante" })}
    >
      {children}
    </a>
  );
}
