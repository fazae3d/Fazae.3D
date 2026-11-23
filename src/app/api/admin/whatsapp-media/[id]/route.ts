import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { ensureMessageMedia, signedMediaUrl } from "@/server/whatsapp/media";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Abre a foto, o áudio ou o documento de uma mensagem do WhatsApp. O endereço desta rota nunca muda (o player de áudio não reinicia
 * quando a tela atualiza); ela confere o login do administrador e manda para um endereço temporário do arquivo.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!ADMIN_AUTH_DISABLED) {
    const session = await auth();
    if (session?.user?.role !== "admin") return new NextResponse("Acesso restrito ao administrador.", { status: 403 });
  }
  const { id } = await params;
  const media = await ensureMessageMedia(id);
  if (!media) return new NextResponse("Arquivo indisponível.", { status: 404 });
  // ?download=1 baixa o arquivo (com nome "fazae-whatsapp-XXXXXX.ext") em vez de abrir.
  const download = new URL(request.url).searchParams.get("download") === "1";
  const extension = media.kind === "stored" ? (/\.([a-z0-9]{1,8})$/i.exec(media.path)?.[1] ?? "bin") : "";
  // Para ver na conversa, o endereço temporário vale 1 h e o navegador lembra dele por 55 min: reabrir ou atualizar a conversa não baixa
  // tudo de novo (cada download sai do armazenamento, que cobra pelo tráfego). Para baixar, o endereço dura só 2 minutos.
  const keepInBrowser = media.kind === "stored" && !download;
  const target = media.kind === "external" ? media.url : await signedMediaUrl(media.path, keepInBrowser ? 3600 : 120, download ? `fazae-whatsapp-${id.slice(-6)}.${extension}` : undefined);
  if (!target) return new NextResponse("Arquivo indisponível.", { status: 404 });
  return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": keepInBrowser ? "private, max-age=3300" : "private, max-age=60" } });
}
