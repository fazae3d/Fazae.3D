import { db } from "../db";
import type { StoreSettings } from "../types";
import { parseChannelFees } from "@/lib/channels";
import { parseStoreRules, type StoreRules } from "@/lib/store-rules";
import { storeDayKey } from "@/lib/store-time";

const SETTINGS_ID = 1;

/**
 * O saldo do Em caixa fica numa coluna só (cashBalanceDate). Saldos novos guardam o instante exato em que foram informados; saldos
 * antigos guardam só a data (meia-noite UTC) e valem para o fim daquele dia.
 */
function cashBalanceMoment(stored: Date | null): { cashBalanceDate?: string; cashBalanceAt?: string } {
  if (!stored) return {};
  const dateOnly = stored.getUTCHours() === 0 && stored.getUTCMinutes() === 0 && stored.getUTCSeconds() === 0 && stored.getUTCMilliseconds() === 0;
  if (dateOnly) {
    const day = stored.toISOString().slice(0, 10);
    return { cashBalanceDate: day, cashBalanceAt: new Date(`${day}T23:59:59.999-03:00`).toISOString() };
  }
  return { cashBalanceDate: storeDayKey(stored), cashBalanceAt: stored.toISOString() };
}

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
    ...cashBalanceMoment(row.cashBalanceDate),
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

/** Saldo informado hoje vale a partir de agora; saldo de um dia anterior vale para o fim daquele dia. */
function cashBalanceInstant(day: string, now = new Date()): Date {
  if (day >= storeDayKey(now)) return new Date(Math.floor(now.getTime() / 1000) * 1000 + 1);
  return new Date(`${day}T23:59:59.001-03:00`);
}

/** Define o saldo em conta (e o dia a que ele se refere) a partir do qual o "Em caixa" é calculado. `date` = AAAA-MM-DD. */
export async function setCashBalance(balance: number, date: string): Promise<StoreSettings> {
  const row = await db.settings.update({ where: { id: SETTINGS_ID }, data: { cashBalance: balance, cashBalanceDate: cashBalanceInstant(date) } });
  settingsCache = null;
  return toSettings(row);
}
