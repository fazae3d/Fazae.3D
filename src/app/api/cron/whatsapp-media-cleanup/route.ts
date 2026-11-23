import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredMedia } from "@/server/whatsapp/media";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Limpeza diária dos arquivos antigos do WhatsApp (vídeos, documentos, fotos e áudios que passaram do prazo de guarda das
 * Regras da loja). Chamada pela Vercel no horário do vercel.json, com "Authorization: Bearer CRON_SECRET".
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
    const result = await cleanupExpiredMedia();
    console.log("[whatsapp] limpeza de arquivos antigos", JSON.stringify(result));
    return NextResponse.json(result);
  } catch (error) {
    console.error("[whatsapp] erro na limpeza de arquivos antigos", error);
    return NextResponse.json({ error: "Falha na limpeza" }, { status: 500 });
  }
}
