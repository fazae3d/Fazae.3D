import type { BadgeTone } from "@/components/admin/page-header";
import type { QuoteDisplayStatus } from "@/lib/quote";

export const QUOTE_TONES: Record<QuoteDisplayStatus, BadgeTone> = {
  rascunho: "neutral",
  enviado: "info",
  aprovado: "success",
  recusado: "danger",
  vencido: "warning",
};
