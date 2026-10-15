"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { updateSettings } from "@/server/repositories/settings-repository";
import type { StoreSettings } from "@/server/types";
import { withMutationFallback } from "@/lib/db-fallback";

const settingsFormSchema = z.object({
  freeShippingThreshold: z.number("Informe um valor válido.").min(0, "O valor não pode ser negativo."),
  localDeliveryThreshold: z.number("Informe um valor válido.").min(0, "O valor não pode ser negativo."),
  localDeliveryFee: z.number("Informe um valor válido.").min(0, "O valor não pode ser negativo."),
  pixDiscountPct: z
    .number("Informe um valor válido.")
    .min(0, "O desconto não pode ser negativo.")
    .max(90, "O desconto no Pix não pode passar de 90%."),
  whatsappNumber: z
    .string()
    .regex(/^\d{10,15}$/, "Use apenas números, com DDI e DDD (ex: 5584999999999)."),
  originCep: z
    .union([z.string().regex(/^\d{8}$/, "CEP deve ter 8 números."), z.literal("")])
    .optional(),
});

export type SettingsFormInput = z.infer<typeof settingsFormSchema>;
export type SettingsMutationResult = { success: true; settings: StoreSettings } | { success: false; error: string };

export async function updateSettingsAction(input: SettingsFormInput): Promise<SettingsMutationResult> {
  const session = await auth();
  if (!ADMIN_AUTH_DISABLED && session?.user?.role !== "admin") {
    return { success: false, error: "Acesso restrito ao administrador." };
  }

  const parsed = settingsFormSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  // TODO(fase DB): remove o try/catch quando a Fazaê tiver o próprio banco — hoje a escrita real falharia sem Supabase configurado.
  const result = await withMutationFallback(async () => {
    const settings = await updateSettings({
      ...parsed.data,
      // CEP vazio limpa o campo (null); undefined deixaria o CEP antigo no lugar.
      originCep: (parsed.data.originCep ? parsed.data.originCep : null) as unknown as string,
    });
    return { success: true, settings } as SettingsMutationResult;
  });
  if (result.success) {
    // Settings affect pages across the whole storefront (shipping, WhatsApp
    // links), so revalidate everything rather than tracking every path.
    revalidatePath("/", "layout");
  }
  return result;
}
