import { db } from "../db";
import type { StoreSettings } from "../types";

const SETTINGS_ID = 1;

function toSettings(row: {
  freeShippingThreshold: number;
  whatsappNumber: string;
  whatsappMessageTemplate: string | null;
  customOrderIntroText: string | null;
  defaultProfitMarginPct: number;
  averageFailureRatePct: number;
  printerCostPerHour: number;
  energyCostPerHour: number;
  defaultMaterialCostPerGram: number;
}): StoreSettings {
  return {
    freeShippingThreshold: row.freeShippingThreshold,
    whatsappNumber: row.whatsappNumber,
    whatsappMessageTemplate: row.whatsappMessageTemplate ?? undefined,
    customOrderIntroText: row.customOrderIntroText ?? undefined,
    defaultProfitMarginPct: row.defaultProfitMarginPct,
    averageFailureRatePct: row.averageFailureRatePct,
    printerCostPerHour: row.printerCostPerHour,
    energyCostPerHour: row.energyCostPerHour,
    defaultMaterialCostPerGram: row.defaultMaterialCostPerGram,
  };
}

export async function getSettings(): Promise<StoreSettings> {
  const row = await db.settings.findUniqueOrThrow({ where: { id: SETTINGS_ID } });
  return toSettings(row);
}

export async function updateSettings(input: Partial<StoreSettings>): Promise<StoreSettings> {
  const row = await db.settings.update({ where: { id: SETTINGS_ID }, data: input });
  return toSettings(row);
}
