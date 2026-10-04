/** "Chaveiro Coração 3D" → "chaveiro-coracao-3d": sem acento, minúsculo, hífens no lugar de espaços e símbolos. */
export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
