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
          "/api/",
          "/esqueci-senha",
          "/redefinir-senha",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
