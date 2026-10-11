/** Só aceita caminho interno ("/loja"); "//site.com", "https://..." e "/\\x" viram "/conta". Evita redirecionar o cliente para um site de terceiros após o login. */
export function safeCallbackUrl(url: string | undefined | null, fallback = "/conta") {
  if (!url || !url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) return fallback;
  return url;
}
