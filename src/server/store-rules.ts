import { withReadFallback } from "@/lib/db-fallback";
import { DEFAULT_RULES, type StoreRules } from "@/lib/store-rules";
import { getSettings } from "./repositories/settings-repository";

/** Regras da loja vigentes (cache curto das configurações). Se o banco não responder, usa os padrões. `fresh` ignora o cache (checkout). */
export async function getStoreRules(options?: { fresh?: boolean }): Promise<StoreRules> {
  return withReadFallback(async () => (await getSettings(options)).rules, DEFAULT_RULES);
}
