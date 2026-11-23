import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/conta",
          "/checkout",
          "/carrinho",
          "/favoritos",
          "/rastreamento",
          "/admin",
          "/orcamento/",
          "/avaliar/",
          "/api/",
          "/esqueci-senha",
          "/redefinir-senha",
        ],
      },
      {
        // Rastreadores de ferramentas de SEO e coletores de dados: não trazem cliente e gastam banda e processamento do servidor.
        userAgent: ["AhrefsBot", "SemrushBot", "MJ12bot", "DotBot", "BLEXBot", "PetalBot", "Bytespider", "DataForSeoBot", "serpstatbot"],
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
