import { NextResponse, after } from "next/server";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { db } from "@/server/db";
import { runCadenceTick } from "@/server/repositories/wa-cadence-repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sinal barato para o painel saber se chegou mensagem nova de cliente: quantas conversas estão não lidas e quando foi a última
 * mensagem recebida. O painel só recarrega a tela (e toca o som) quando algum dos dois muda. Uma única consulta ao banco.
 */
export async function GET(request: Request) {
  if (!ADMIN_AUTH_DISABLED) {
    const session = await auth();
    if (session?.user?.role !== "admin") return new NextResponse("Acesso restrito ao administrador.", { status: 403 });
  }
  // Enquanto o painel está aberto, aproveita para fazer a rodada das cadências (as travas de envio ligado, horário, limite do dia e
  // intervalo entre mensagens valem do mesmo jeito; fora isso a rodada não faz nada). Reforça o agendador externo, que nem sempre roda no ritmo.
  // Só quando o painel pede (?tick=1): nem toda consulta precisa disparar a rodada.
  if (new URL(request.url).searchParams.get("tick") === "1") {
    after(async () => {
      try {
        await runCadenceTick();
      } catch (error) {
        console.error("[whatsapp] erro na rodada pelo painel", error);
      }
    });
  }
  try {
    const [row] = await db.$queryRaw<{ unread: number; last: Date | string | null }[]>`
      SELECT COUNT(*) FILTER (WHERE "unreadCount" > 0)::int AS unread, MAX("lastInboundAt") AS last FROM "WaConversation"`;
    const last = row?.last ? (row.last instanceof Date ? row.last.toISOString() : String(row.last)) : null;
    return NextResponse.json({ unread: row?.unread ?? 0, lastInboundAt: last }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "indisponível" }, { status: 503 });
  }
}
