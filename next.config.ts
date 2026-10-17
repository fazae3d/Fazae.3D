import type { NextConfig } from "next";
import { SLUG_ALIASES } from "./src/lib/slug-aliases";

const nextConfig: NextConfig = {
  images: {
    // As fotos dos produtos ficam no Storage do Supabase (bucket público). Sem isso o next/image não otimiza imagens externas.
    remotePatterns: [{ protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" }],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 7,
  },
  // Lets the dev server serve JS chunks/HMR when opened via the LAN IP
  // (e.g. testing on a phone) — without this, Next 16 silently blocks
  // those requests as cross-origin and the page loads but never hydrates,
  // so every button looks dead even though the markup is correct.
  // Fotos de celular passam de 1 MB (limite padrão das ações do servidor). O formulário já reduz a foto antes de enviar;
  // isto é uma folga de segurança (a Vercel aceita no máximo ~4,5 MB por requisição).
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
  allowedDevOrigins: ["192.168.1.144", "192.168.88.118"],
  async redirects() {
    return Object.entries(SLUG_ALIASES).map(([from, to]) => ({
      source: `/produto/${from}`,
      destination: `/produto/${to}`,
      permanent: true,
    }));
  },
  async headers() {
    // Imagens da pasta public saíam com "max-age=0": o navegador revalidava tudo a cada visita. 30 dias + revalidação em segundo plano.
    const STATIC_IMAGE_CACHE = "public, max-age=2592000, stale-while-revalidate=86400";
    return [
      ...["categories", "products", "teaser", "how-it-works", "trust-badges"].map((dir) => ({
        source: `/${dir}/:path*`,
        headers: [{ key: "Cache-Control", value: STATIC_IMAGE_CACHE }],
      })),
      {
        source: "/:file(.+\\.(?:webp|png|jpg|jpeg|svg|avif|ico))",
        headers: [{ key: "Cache-Control", value: STATIC_IMAGE_CACHE }],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // SAMEORIGIN (e não DENY): o Precificador do painel roda num iframe da própria loja.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
