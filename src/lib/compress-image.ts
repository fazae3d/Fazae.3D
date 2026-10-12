/**
 * Reduz uma foto no navegador antes do envio: lado maior de até 1600 px e WebP com qualidade 82. Uma foto de celular de 4 a 8 MB
 * vira algo em torno de 150 a 400 KB, o que também deixa a loja bem mais rápida. GIF (pode ser animado) e arquivos que já são
 * pequenos seguem como estão; se algo falhar, devolve o arquivo original.
 */
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.type !== "image/webp") return file;
    // Se já era pequena e a conversão não ajudou, mantém a original.
    if (blob.size >= file.size && scale === 1) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}
