import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runCadenceTick } from "@/server/repositories/wa-cadence-repository";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Rodada do envio automático de cadências. A Vercel gratuita só agenda 1 execução por dia, então quem chama esta rota a cada
 * ~10 minutos é o GitHub Actions (.github/workflows/whatsapp-cadences.yml), com "Authorization: Bearer CRON_SECRET".
 * Sem CRON_SECRET a rota fica fechada em produção.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") return NextResponse.json({ error: "CRON_SECRET não configurado" }, { status: 503 });
  } else {
    const given = Buffer.from(request.headers.get("authorization") ?? "");
    const expected = Buffer.from(`Bearer ${secret}`);
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json(await runCadenceTick());
  } catch (error) {
    console.error("[whatsapp] erro na rodada de cadências", error);
    return NextResponse.json({ error: "Falha na rodada" }, { status: 500 });
  }
}
