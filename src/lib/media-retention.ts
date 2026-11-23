/**
 * Prazo de guarda dos arquivos das conversas do WhatsApp no armazenamento do painel (que é cobrado por espaço usado).
 * Vídeos e documentos pesam muito mais que fotos e áudios, então têm prazo próprio, mais curto. Passado o prazo o arquivo sai do
 * painel (a mensagem e o texto ficam), mas continua no WhatsApp. 0 dias = guardar para sempre.
 */
export const BIG_FILE_TYPES = ["video", "document"] as const;

export function isBigFileType(mediaType: string | null): boolean {
  return mediaType !== null && (BIG_FILE_TYPES as readonly string[]).includes(mediaType);
}

/** Mensagens mais antigas que esta data (nesse tipo de arquivo) já passaram do prazo. `null` = nunca vence. */
export function mediaCutoff(keepDays: number, now: Date): Date | null {
  if (!Number.isFinite(keepDays) || keepDays <= 0) return null;
  return new Date(now.getTime() - keepDays * 86_400_000);
}

export function isMediaExpired(mediaType: string | null, createdAt: Date, keep: { mediaKeepDays: number; bigFileKeepDays: number }, now: Date): boolean {
  const cutoff = mediaCutoff(isBigFileType(mediaType) ? keep.bigFileKeepDays : keep.mediaKeepDays, now);
  return cutoff !== null && createdAt < cutoff;
}
