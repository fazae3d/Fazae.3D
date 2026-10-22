import { db } from "../db";
import { LEAD_STAGE_KEYS } from "@/lib/whatsapp";
import { analyzeResults, type ResultMessage, type WaResults } from "@/lib/wa-results";

/** Resultados dos últimos `days` dias de mensagens (os contatos contam todos). */
export async function getWaResults(days = 90, now = new Date()): Promise<WaResults> {
  const since = new Date(now.getTime() - days * 86_400_000);
  const [conversations, messages] = await Promise.all([
    db.waConversation.findMany({ select: { id: true, stage: true, source: true, lastInboundAt: true, optedOut: true } }),
    db.waMessage.findMany({
      where: { createdAt: { gte: since } },
      select: { conversationId: true, direction: true, origin: true, status: true, cadenceId: true, stepIndex: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 30_000,
    }),
  ]);
  return analyzeResults(
    conversations,
    messages.map((m): ResultMessage => ({ ...m, direction: m.direction === "in" ? "in" : "out" })),
    LEAD_STAGE_KEYS,
  );
}
