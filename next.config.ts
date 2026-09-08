import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Lets the dev server serve JS chunks/HMR when opened via the LAN IP
  // (e.g. testing on a phone) — without this, Next 16 silently blocks
  // those requests as cross-origin and the page loads but never hydrates,
  // so every button looks dead even though the markup is correct.
  allowedDevOrigins: ["192.168.1.144", "192.168.88.118"],
};

export default nextConfig;
