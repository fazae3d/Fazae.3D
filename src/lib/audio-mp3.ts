/**
 * Converte uma gravação do navegador (webm/ogg/mp4) em MP3. O WhatsApp (pela uazapi) aceita MP3 ou OGG como áudio, e o Chrome
 * só grava em webm; por isso a conversão é feita aqui, no navegador, antes de enviar. Só roda no cliente.
 */
export async function recordingToMp3(recording: Blob): Promise<Blob> {
  const { Mp3Encoder } = await import("@breezystack/lamejs");
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await recording.arrayBuffer());
    const channel = audio.getChannelData(0);
    const samples = new Int16Array(channel.length);
    for (let i = 0; i < channel.length; i++) {
      const s = Math.max(-1, Math.min(1, channel[i]));
      samples[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    const encoder = new Mp3Encoder(1, audio.sampleRate, 96);
    const parts: BlobPart[] = [];
    for (let i = 0; i < samples.length; i += 1152) {
      const chunk = encoder.encodeBuffer(samples.subarray(i, i + 1152));
      if (chunk.length > 0) parts.push(new Uint8Array(chunk));
    }
    const rest = encoder.flush();
    if (rest.length > 0) parts.push(new Uint8Array(rest));
    return new Blob(parts, { type: "audio/mpeg" });
  } finally {
    void context.close();
  }
}

/** mm:ss */
export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}
