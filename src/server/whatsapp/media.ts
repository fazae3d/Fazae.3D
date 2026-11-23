import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";
import { BIG_FILE_TYPES, mediaCutoff } from "@/lib/media-retention";
import { db } from "../db";
import { getStoreRules } from "../store-rules";
import { getWhatsAppProvider } from "./provider";

/** Bucket privado: foto, áudio e documento de cliente só abrem para quem está logado no painel (ver a rota whatsapp-media). */
export const WHATSAPP_MEDIA_BUCKET = "whatsapp-media";
/** Prefixo guardado em WaMessage.mediaUrl quando o arquivo já está no nosso armazenamento (o resto é o nome do arquivo). */
export const STORED_MEDIA_PREFIX = "wa-media:";
/** Guardado em WaMessage.mediaUrl depois que o arquivo passou do prazo de guarda e foi apagado do armazenamento (não baixa de novo). */
export const EXPIRED_MEDIA = "wa-expired:";

/**
 * Só foto, áudio e figurinha são guardados assim que chegam (aparecem direto na conversa). Vídeo e documento só são baixados
 * na primeira vez que alguém abre: muitos nunca são abertos e ocupariam espaço à toa.
 */
export function storeOnArrival(mediaType: string | null): boolean {
  return mediaType === "image" || mediaType === "audio" || mediaType === "sticker";
}

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
  if (row.mediaUrl === EXPIRED_MEDIA) return null;
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

/** Endereço temporário (2 minutos por padrão) para abrir um arquivo guardado. */
export async function signedMediaUrl(path: string, seconds = 120, downloadAs?: string): Promise<string | null> {
  const store = storage();
  if (!store) return null;
  // Com nome de arquivo, o endereço manda o navegador baixar em vez de abrir.
  const { data, error } = await store.from(WHATSAPP_MEDIA_BUCKET).createSignedUrl(path, seconds, downloadAs ? { download: downloadAs } : undefined);
  return error ? null : data.signedUrl;
}

/** Arquivos que o painel envia ficam em "out/". O nome é sempre gerado aqui (uuid + extensão), nunca o do arquivo original. */
export const OUTGOING_PATH = /^out\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/;
export const MAX_OUTGOING_BYTES = MAX_BYTES;

export function outgoingExtension(fileName: string, contentType: string): string {
  const fromName = /\.([A-Za-z0-9]{1,8})$/.exec(fileName)?.[1]?.toLowerCase();
  return fromName ?? EXTENSION_BY_MIME[contentType.toLowerCase()] ?? "bin";
}

/**
 * Prepara o envio direto do navegador para o armazenamento (arquivos grandes não passam pelo servidor do site, que tem limite de
 * tamanho por requisição). Devolve o endereço de envio, que vale por pouco tempo, e o caminho final do arquivo.
 */
export async function createOutgoingUpload(extension: string): Promise<{ ok: true; path: string; uploadUrl: string } | { ok: false; error: string }> {
  const store = storage();
  if (!store) return { ok: false, error: "O armazenamento de arquivos não está configurado no servidor." };
  const path = `out/${randomUUID()}.${extension}`;
  let signed = await store.from(WHATSAPP_MEDIA_BUCKET).createSignedUploadUrl(path);
  if (signed.error && /not found|bucket/i.test(signed.error.message)) {
    await store.createBucket(WHATSAPP_MEDIA_BUCKET, { public: false, fileSizeLimit: MAX_BYTES });
    signed = await store.from(WHATSAPP_MEDIA_BUCKET).createSignedUploadUrl(path);
  }
  if (signed.error || !signed.data) return { ok: false, error: "Não foi possível preparar o envio do arquivo." };
  return { ok: true, path, uploadUrl: signed.data.signedUrl };
}

/**
 * Apaga do armazenamento os arquivos que passaram do prazo de guarda (Regras da loja, Lembretes e prazos automáticos) e marca a
 * mensagem como "arquivo removido". O texto da conversa fica; o arquivo continua no WhatsApp. Roda 1 vez por dia (cron).
 */
export async function cleanupExpiredMedia(now = new Date()): Promise<{ removed: number; note?: string }> {
  const store = storage();
  if (!store) return { removed: 0, note: "armazenamento não configurado" };
  const { automation } = await getStoreRules();
  const classes = [
    { cutoff: mediaCutoff(automation.bigFileKeepDays, now), type: { in: [...BIG_FILE_TYPES] as string[] } },
    { cutoff: mediaCutoff(automation.mediaKeepDays, now), type: { notIn: [...BIG_FILE_TYPES] as string[] } },
  ];
  let removed = 0;
  for (const { cutoff, type } of classes) {
    if (!cutoff) continue;
    // Em lotes, para não estourar o tempo da função se houver muita coisa acumulada; o que sobrar sai no dia seguinte.
    for (let round = 0; round < 10; round += 1) {
      const rows = await db.waMessage.findMany({
        where: { mediaUrl: { startsWith: STORED_MEDIA_PREFIX }, createdAt: { lt: cutoff }, mediaType: type },
        select: { id: true, mediaUrl: true },
        take: 200,
      });
      if (rows.length === 0) break;
      const paths = rows.map((r) => (r.mediaUrl as string).slice(STORED_MEDIA_PREFIX.length));
      const result = await store.from(WHATSAPP_MEDIA_BUCKET).remove(paths);
      if (result.error) throw new Error("não foi possível apagar os arquivos: " + result.error.message);
      await db.waMessage.updateMany({ where: { id: { in: rows.map((r) => r.id) } }, data: { mediaUrl: EXPIRED_MEDIA } });
      removed += rows.length;
    }
  }
  return { removed };
}
