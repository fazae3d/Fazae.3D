import type { Metadata } from "next";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

/**
 * Metadados de uma página pública: título, descrição, canonical e as tags de compartilhamento (Open Graph/Twitter).
 * O Next NÃO herda o openGraph da página-mãe campo a campo: quando a página define o seu, ele substitui o do layout.
 * Sem isto, /loja, /faq, /sobre etc. saíam com título, descrição e URL da home no WhatsApp/Facebook.
 */
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const fullTitle = `${title} | ${SITE_NAME} 3D`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: "pt_BR", siteName: SITE_NAME, title: fullTitle, description, url: `${SITE_URL}${path}` },
    twitter: { card: "summary_large_image", title: fullTitle, description },
  };
}
