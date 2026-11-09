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
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!ADMIN_AUTH_DISABLED) {
    const session = await auth();
    if (session?.user?.role !== "admin") return new NextResponse("Acesso restrito ao administrador.", { status: 403 });
  }
  const { id } = await params;
  const media = await ensureMessageMedia(id);
  if (!media) return new NextResponse("Arquivo indisponível.", { status: 404 });
  const target = media.kind === "external" ? media.url : await signedMediaUrl(media.path);
  if (!target) return new NextResponse("Arquivo indisponível.", { status: 404 });
  return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "private, max-age=60" } });
}
