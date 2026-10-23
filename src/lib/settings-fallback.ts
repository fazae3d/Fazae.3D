import { DEFAULT_RULES, publicRules, type PublicRules } from "@/lib/store-rules";
import { DEFAULT_WHATSAPP_NUMBER } from "@/lib/site-config";
import type { StoreSettings } from "@/server/types";

/** Configurações usadas só quando o banco não responde: a loja continua de pé com os padrões. */
export const FALLBACK_SETTINGS: StoreSettings = {
  freeShippingThreshold: 299.9,
  whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  rules: DEFAULT_RULES,
};

/** O que o navegador recebe das configurações: sem o que é só do servidor (margem, custos, e-mail do dono). */
export type PublicSettings = Pick<
  StoreSettings,
  "freeShippingThreshold" | "whatsappNumber" | "whatsappMessageTemplate" | "customOrderIntroText" | "localDeliveryThreshold" | "localDeliveryFee" | "pixDiscountPct"
> & { rules: PublicRules };

export const FALLBACK_PUBLIC_SETTINGS: PublicSettings = {
  freeShippingThreshold: 299.9,
  whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  rules: publicRules(DEFAULT_RULES),
};
