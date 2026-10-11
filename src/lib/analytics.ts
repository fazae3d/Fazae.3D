/** Eventos do Google Analytics 4. Só disparam se a pessoa aceitou os cookies de medição (ver CookieConsent). */
type GtagParams = Record<string, unknown>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

export const CONSENT_STORAGE_KEY = "fazae-cookie-consent";

export function trackEvent(name: string, params?: GtagParams) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("event", name, params);
}
