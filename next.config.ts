import type { NextConfig } from "next";
import { SLUG_ALIASES } from "./src/lib/slug-aliases";

const nextConfig: NextConfig = {
  // Lets the dev server serve JS chunks/HMR when opened via the LAN IP
  // (e.g. testing on a phone) — without this, Next 16 silently blocks
  // those requests as cross-origin and the page loads but never hydrates,
  // so every button looks dead even though the markup is correct.
  allowedDevOrigins: ["192.168.1.144", "192.168.88.118"],
  async redirects() {
    return Object.entries(SLUG_ALIASES).map(([from, to]) => ({
      source: `/produto/${from}`,
      destination: `/produto/${to}`,
      permanent: true,
    }));
  },
  async headers() {
    return [
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
