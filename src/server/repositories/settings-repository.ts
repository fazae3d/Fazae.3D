import { db } from "../db";
import type { StoreSettings } from "../types";
import { parseChannelFees } from "@/lib/channels";
import { parseStoreRules, type StoreRules } from "@/lib/store-rules";

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
  channelFees: unknown;
  monthlyGoal: number;
  cashBalance: number;
  cashBalanceDate: Date | null;
  rules: unknown;
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
    channelFees: parseChannelFees(row.channelFees),
    monthlyGoal: row.monthlyGoal,
    cashBalance: row.cashBalance,
    cashBalanceDate: row.cashBalanceDate?.toISOString().slice(0, 10),
    rules: parseStoreRules(row.rules),
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

/** Esquece o cache das configurações (usado quando algo altera Settings por fora deste repositório, como desfazer em Atividade). */
export function clearSettingsCache() {
  settingsCache = null;
}

export async function updateSettings(input: Partial<Omit<StoreSettings, "rules">>): Promise<StoreSettings> {
  const row = await db.settings.update({ where: { id: SETTINGS_ID }, data: input });
  settingsCache = null;
  return toSettings(row);
}

/** Salva as regras da loja (já validadas) e limpa o cache para valerem na hora. */
export async function updateStoreRules(rules: StoreRules): Promise<StoreSettings> {
  const row = await db.settings.update({ where: { id: SETTINGS_ID }, data: { rules } });
  settingsCache = null;
  return toSettings(row);
}

/** Define o saldo em conta (e o dia a que ele se refere) a partir do qual o "Em caixa" é calculado. `date` = AAAA-MM-DD. */
export async function setCashBalance(balance: number, date: string): Promise<StoreSettings> {
  const row = await db.settings.update({ where: { id: SETTINGS_ID }, data: { cashBalance: balance, cashBalanceDate: new Date(`${date}T00:00:00.000Z`) } });
  settingsCache = null;
  return toSettings(row);
}
