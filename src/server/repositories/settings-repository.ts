import { db } from "../db";
import type { StoreSettings } from "../types";

const SETTINGS_ID = 1;

function toSettings(row: { freeShippingThreshold: number; whatsappNumber: string; whatsappMessageTemplate: string | null; customOrderIntroText: string | null }): StoreSettings {
  return {
    freeShippingThreshold: row.freeShippingThreshold,
    whatsappNumber: row.whatsappNumber,
    whatsappMessageTemplate: row.whatsappMessageTemplate ?? undefined,
    customOrderIntroText: row.customOrderIntroText ?? undefined,
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
