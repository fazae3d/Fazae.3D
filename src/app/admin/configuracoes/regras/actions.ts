"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { withMutationFallback } from "@/lib/db-fallback";
import { validateRulesInput, type StoreRules } from "@/lib/store-rules";
import { updateStoreRules } from "@/server/repositories/settings-repository";

export type RulesMutationResult = { success: true; rules: StoreRules } | { success: false; error: string };

/**
 * Salva as Regras da loja. Valida tudo no servidor (o formulário só ajuda) e grava o conjunto inteiro; a auditoria
 * automática do modelo Settings registra, regra por regra, de quanto para quanto cada uma mudou (e permite desfazer).
 */
export async function updateStoreRulesAction(input: unknown): Promise<RulesMutationResult> {
  if (!ADMIN_AUTH_DISABLED) {
    const session = await auth();
    if (session?.user?.role !== "admin") return { success: false, error: "Acesso restrito ao administrador." };
  }

  const checked = validateRulesInput(input);
  if (!checked.ok) return { success: false, error: checked.error };

  const result = await withMutationFallback(async () => {
    const settings = await updateStoreRules(checked.rules);
    return { success: true, rules: settings.rules } as RulesMutationResult;
  });
  if (result.success) {
    // As regras aparecem no rodapé, no checkout, nos e-mails e no Google: renova a loja inteira.
    revalidatePath("/", "layout");
  }
  return result;
}
