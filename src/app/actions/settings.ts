"use server";

import { getSettings } from "@/server/repositories/settings-repository";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/site-config";

/**
 * The only sanctioned way for a Client Component to read store settings.
 * Client bundles can't share memory with the server process, so a static
 * import of a constant would freeze a build-time copy that never sees
 * admin edits from /admin/configuracoes — this round-trips to the live
 * server store instead.
 *
 * TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco —
 * hoje o Settings ainda não existe para este projeto, então a leitura real
 * falharia em toda página.
 */
export async function getSettingsSnapshotAction() {
  try {
    return await getSettings();
  } catch {
    return { freeShippingThreshold: 299.9, whatsappNumber: DEFAULT_WHATSAPP_NUMBER };
  }
}
