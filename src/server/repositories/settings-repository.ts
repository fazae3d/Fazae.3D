import { db } from "../db";
import type { StoreSettings } from "../types";

const SETTINGS_ID = 1;

function toSettings(row: {
  freeShippingThreshold: number;
  whatsappNumber: string;
  whatsappMessageTemplate: string | null;
  customOrderIntroText: string | null;
  originCep: string | null;
  defaultProfitMarginPct: number;
  averageFailureRatePct: number;
  printerCostPerHour: number;
  energyCostPerHour: number;
  defaultMaterialCostPerGram: number;
  localDeliveryThreshold: number;
  localDeliveryFee: number;
  pixDiscountPct: number;
}): StoreSettings {
  return {
    freeShippingThreshold: row.freeShippingThreshold,
    whatsappNumber: row.whatsappNumber,
    whatsappMessageTemplate: row.whatsappMessageTemplate ?? undefined,
    customOrderIntroText: row.customOrderIntroText ?? undefined,
    originCep: row.originCep ?? undefined,
    defaultProfitMarginPct: row.defaultProfitMarginPct,
    averageFailureRatePct: row.averageFailureRatePct,
    printerCostPerHour: row.printerCostPerHour,
    energyCostPerHour: row.energyCostPerHour,
    defaultMaterialCostPerGram: row.defaultMaterialCostPerGram,
    localDeliveryThreshold: row.localDeliveryThreshold,
    localDeliveryFee: row.localDeliveryFee,
    pixDiscountPct: row.pixDiscountPct,
  };
}

/**
 * Quase toda página lê as configurações (layout, rodapé, checkout...), e elas quase nunca mudam. Um cache curto por instância
 * evita uma ida ao banco por página (isso pesava no tempo de resposta). É limpo assim que o painel salva uma alteração.
 */
const SETTINGS_CACHE_TTL_MS = 60_000;
let settingsCache: { at: number; value: StoreSettings } | null = null;

/** `fresh: true` ignora o cache: usado onde o valor decide quanto o cliente paga (checkout), para nunca cobrar com um percentual/frete desatualizado. */
export async function getSettings(options?: { fresh?: boolean }): Promise<StoreSettings> {
  if (!options?.fresh && settingsCache && Date.now() - settingsCache.at < SETTINGS_CACHE_TTL_MS) return settingsCache.value;
  const row = await db.settings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
  const value = toSettings(row);
  settingsCache = { at: Date.now(), value };
  return value;
}

export async function updateSettings(input: Partial<StoreSettings>): Promise<StoreSettings> {
  const row = await db.settings.update({ where: { id: SETTINGS_ID }, data: input });
  settingsCache = null;
  return toSettings(row);
}
