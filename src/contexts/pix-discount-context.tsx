"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_PIX_DISCOUNT_PCT } from "@/lib/money";

const PixDiscountContext = createContext<number>(DEFAULT_PIX_DISCOUNT_PCT);

/**
 * Carries the admin-editable Pix discount (%) from the storefront layout, which
 * reads it server-side, down to every client component that shows a Pix price —
 * so there's no flash of a stale percentage while a client-side fetch resolves.
 */
export function PixDiscountProvider({ pct, children }: { pct: number; children: ReactNode }) {
  return <PixDiscountContext.Provider value={pct}>{children}</PixDiscountContext.Provider>;
}

export function usePixDiscountPct() {
  return useContext(PixDiscountContext);
}
