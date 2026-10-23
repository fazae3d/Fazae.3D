"use server";

import { getSettings } from "@/server/repositories/settings-repository";
import { FALLBACK_PUBLIC_SETTINGS, type PublicSettings } from "@/lib/settings-fallback";
import { publicRules } from "@/lib/store-rules";

/**
 * The only sanctioned way for a Client Component to read store settings.
 * Client bundles can't share memory with the server process, so a static
 * import of a constant would freeze a build-time copy that never sees
 * admin edits from /admin/configuracoes, this round-trips to the live
 * server store instead.
 */
export async function getSettingsSnapshotAction(): Promise<PublicSettings> {
  try {
    const s = await getSettings();
    // Só o que a loja precisa: margem, custo de hora/energia, taxa de falha, CEP de origem e e-mail do dono não saem do servidor.
    return {
      freeShippingThreshold: s.freeShippingThreshold,
      whatsappNumber: s.whatsappNumber,
      whatsappMessageTemplate: s.whatsappMessageTemplate,
      customOrderIntroText: s.customOrderIntroText,
      localDeliveryThreshold: s.localDeliveryThreshold,
      localDeliveryFee: s.localDeliveryFee,
      pixDiscountPct: s.pixDiscountPct,
      rules: publicRules(s.rules),
    };
  } catch {
    return FALLBACK_PUBLIC_SETTINGS;
  }
}
