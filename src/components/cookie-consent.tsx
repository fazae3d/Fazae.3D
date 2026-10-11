"use client";

import Script from "next/script";
import Link from "next/link";
import { useEffect, useState } from "react";
import { CONSENT_STORAGE_KEY } from "@/lib/analytics";

// ID público do Google Analytics da Fazaê (pode ser sobrescrito pela variável NEXT_PUBLIC_GA_ID na Vercel).
const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-40WGQ4CV8G";

type Consent = "accepted" | "declined" | null;

function readConsent(): Consent {
  try {
    const value = localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "accepted" || value === "declined" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Aviso de cookies + carregamento do Google Analytics. O Analytics só é carregado depois do "Aceitar".
 */
export function CookieConsent() {
  const [consent, setConsent] = useState<Consent>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setConsent(readConsent());
    setReady(true);
  }, []);

  if (!GA_ID) return null;

  const choose = (value: "accepted" | "declined") => {
    try {
      localStorage.setItem(CONSENT_STORAGE_KEY, value);
    } catch {
      // Sem armazenamento (navegação privada): a escolha só vale nesta visita.
    }
    setConsent(value);
  };

  return (
    <>
      {consent === "accepted" && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${GA_ID}', { anonymize_ip: true });`}
          </Script>
        </>
      )}

      {ready && consent === null && (
        <div
          role="dialog"
          aria-label="Aviso de cookies"
          className="fixed inset-x-0 bottom-0 z-[60] border-t border-paper/15 bg-ink p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.5)] sm:p-5"
        >
          <div className="mx-auto flex max-w-5xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-graphite sm:text-sm">
              Usamos cookies de medição (Google Analytics) para entender como o site é usado e melhorar a sua experiência. Você pode
              recusar sem perder nada. Saiba mais na{" "}
              <Link href="/privacidade" className="text-petrol hover:underline">
                Política de Privacidade
              </Link>
              .
            </p>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => choose("declined")}
                className="label-caps rounded-full border border-paper/25 px-6 py-3 text-[11px] text-paper transition-colors hover:border-petrol hover:text-petrol"
              >
                Recusar
              </button>
              <button
                type="button"
                onClick={() => choose("accepted")}
                className="label-caps rounded-full bg-petrol px-6 py-3 text-[11px] text-ink transition-colors hover:bg-paper"
              >
                Aceitar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
