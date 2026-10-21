import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { parseUazapiMessage, parseUazapiStatusUpdate } from "@/lib/whatsapp";
import { applyStatusUpdate, recordInboundMessage } from "@/server/repositories/whatsapp-repository";

export const dynamic = "force-dynamic";

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * A uazapi não assina os webhooks. Por isso a URL cadastrada lá leva um segredo (?s=...) e o "token" do corpo precisa ser o da nossa
 * instância. Em produção, sem segredo configurado, recusa tudo (falha fechada).
 */
function authorized(request: NextRequest, payload: { token?: unknown }) {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  const given = request.nextUrl.searchParams.get("s") ?? "";
  if (!safeEqual(given, secret)) return false;
  const instanceToken = process.env.UAZAPI_TOKEN;
  return !instanceToken || typeof payload.token !== "string" || safeEqual(payload.token, instanceToken);
}

export async function POST(request: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (!authorized(request, payload)) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  try {
    const message = parseUazapiMessage(payload);
    if (message) {
      await recordInboundMessage(message);
    } else {
      const update = parseUazapiStatusUpdate(payload);
      if (update) await applyStatusUpdate(update.providerIds, update.status);
    }
  } catch (error) {
    // Respondemos 200 mesmo assim: reenviar o mesmo evento não resolveria e só atrasaria os próximos. O erro fica no log.
    console.error("[whatsapp] erro ao processar webhook", error);
  }
  return NextResponse.json({ ok: true });
}
