"use client";

import { createContext, useContext, type ReactNode } from "react";
import { DEFAULT_RULES, publicRules, type PublicRules } from "@/lib/store-rules";

const StoreRulesContext = createContext<PublicRules>(publicRules(DEFAULT_RULES));

/** Leva as Regras da loja (editáveis no painel) do layout, que lê no servidor, para os componentes do navegador, sem piscar o valor antigo. */
export function StoreRulesProvider({ rules, children }: { rules: PublicRules; children: ReactNode }) {
  return <StoreRulesContext.Provider value={rules}>{children}</StoreRulesContext.Provider>;
}

export function useStoreRules() {
  return useContext(StoreRulesContext);
}
