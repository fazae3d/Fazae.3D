import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { db } from "../db";
import { getWhatsAppProvider } from "./provider";

/** Bucket privado: foto, áudio e documento de cliente só abrem para quem está logado no painel (ver a rota whatsapp-media). */
export const WHATSAPP_MEDIA_BUCKET = "whatsapp-media";
/** Prefixo guardado em WaMessage.mediaUrl quando o arquivo já está no nosso armazenamento (o resto é o nome do arquivo). */
export const STORED_MEDIA_PREFIX = "wa-media:";

const MAX_BYTES = 25 * 1024 * 1024;
const NO_FILE_TYPES = new Set(["location", "contact"]);

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/aac": "aac",
  "video/mp4": "mp4",
  "video/3gpp": "3gp",
  "application/pdf": "pdf",
};

function storage() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key).storage;
}

/** Mensagem com arquivo que o painel consegue mostrar (localização e contato não têm arquivo). */
export function hasViewableMedia(mediaType: string | null): boolean {
  return Boolean(mediaType) && !NO_FILE_TYPES.has(mediaType as string);
}

export type MessageMedia = { kind: "stored"; path: string } | { kind: "external"; url: string };

/**
 * Devolve onde está o arquivo da mensagem. Se ainda não foi guardado, pede à uazapi (o endereço dela vale só 2 dias), baixa e guarda no
 * nosso armazenamento. Por isso funciona também para mensagens antigas e para quando o download no momento do recebimento falhou.
 */
export async function ensureMessageMedia(messageId: string): Promise<MessageMedia | null> {
  const row = await db.waMessage.findUnique({ where: { id: messageId }, select: { id: true, direction: true, mediaType: true, mediaUrl: true, providerId: true } });
  if (!row || !hasViewableMedia(row.mediaType)) return null;
  if (row.mediaUrl?.startsWith(STORED_MEDIA_PREFIX)) return { kind: "stored", path: row.mediaUrl.slice(STORED_MEDIA_PREFIX.length) };
  // Arquivo que nós mesmos enviamos (ex.: PDF do orçamento) já tem endereço público nosso.
  if (row.direction === "out" && row.mediaUrl && /^https?:\/\//i.test(row.mediaUrl)) return { kind: "external", url: row.mediaUrl };
  if (!row.providerId || row.providerId.startsWith("sim-")) return row.mediaUrl ? { kind: "external", url: row.mediaUrl } : null;

  const provider = getWhatsAppProvider();
  const store = storage();
  if (!provider.downloadMedia || !store) return row.mediaUrl ? { kind: "external", url: row.mediaUrl } : null;

  const downloaded = await provider.downloadMedia(row.providerId);
  if (!downloaded) return row.mediaUrl ? { kind: "external", url: row.mediaUrl } : null;

  try {
    const res = await fetch(downloaded.url, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) return { kind: "external", url: downloaded.url };
    const declared = Number(res.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES) return { kind: "external", url: downloaded.url };
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length > MAX_BYTES) return { kind: "external", url: downloaded.url };

    const mime = (downloaded.mimetype || res.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
    const path = `${randomUUID()}.${EXTENSION_BY_MIME[mime] ?? "bin"}`;
    let upload = await store.from(WHATSAPP_MEDIA_BUCKET).upload(path, buffer, { contentType: mime, cacheControl: "31536000" });
    if (upload.error && /not found|bucket/i.test(upload.error.message)) {
      await store.createBucket(WHATSAPP_MEDIA_BUCKET, { public: false });
      upload = await store.from(WHATSAPP_MEDIA_BUCKET).upload(path, buffer, { contentType: mime, cacheControl: "31536000" });
    }
    if (upload.error) return { kind: "external", url: downloaded.url };

    await db.waMessage.update({ where: { id: row.id }, data: { mediaUrl: `${STORED_MEDIA_PREFIX}${path}` } });
    return { kind: "stored", path };
  } catch {
    return { kind: "external", url: downloaded.url };
  }
}

/** Endereço temporário (2 minutos) para abrir um arquivo guardado. */
export async function signedMediaUrl(path: string): Promise<string | null> {
  const store = storage();
  if (!store) return null;
  const { data, error } = await store.from(WHATSAPP_MEDIA_BUCKET).createSignedUrl(path, 120);
  return error ? null : data.signedUrl;
}
