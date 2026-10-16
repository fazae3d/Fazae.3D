import { round2 } from "@/lib/money";
import type { SaleChannel } from "@/server/types";

export const CHANNEL_LABELS: Record<SaleChannel, string> = {
  online: "Site",
  presencial: "Presencial",
  whatsapp: "WhatsApp",
  mercado_livre: "Mercado Livre",
  shopee: "Shopee",
  tiktok_shop: "TikTok Shop",
};

/** Canais em que um marketplace cobra comissão e taxa fixa sobre cada venda. */
export const MARKETPLACE_CHANNELS = ["mercado_livre", "shopee", "tiktok_shop"] as const;
export type MarketplaceChannel = (typeof MARKETPLACE_CHANNELS)[number];

export function isMarketplace(channel: SaleChannel): channel is MarketplaceChannel {
  return (MARKETPLACE_CHANNELS as readonly string[]).includes(channel);
}

/** `pct` = comissão (% do valor vendido); `fixed` = taxa fixa por unidade (R$). */
export type ChannelFee = { pct: number; fixed: number };
export type ChannelFees = Partial<Record<MarketplaceChannel, ChannelFee>>;

/** Lê o JSON salvo nas configurações, ignorando o que não for número válido. */
export function parseChannelFees(raw: unknown): ChannelFees {
  const fees: ChannelFees = {};
  if (!raw || typeof raw !== "object") return fees;
  for (const channel of MARKETPLACE_CHANNELS) {
    const entry = (raw as Record<string, unknown>)[channel] as { pct?: unknown; fixed?: unknown } | undefined;
    const pct = Number(entry?.pct);
    const fixed = Number(entry?.fixed);
    if (entry && (Number.isFinite(pct) || Number.isFinite(fixed))) {
      fees[channel] = { pct: Number.isFinite(pct) && pct > 0 ? pct : 0, fixed: Number.isFinite(fixed) && fixed > 0 ? fixed : 0 };
    }
  }
  return fees;
}

/** Taxa estimada do marketplace numa venda: comissão sobre o valor vendido + taxa fixa por unidade. */
export function computeChannelFee(fee: ChannelFee | undefined, total: number, units: number) {
  if (!fee) return 0;
  return round2(Math.max(0, total) * (fee.pct / 100) + fee.fixed * Math.max(0, units));
}
