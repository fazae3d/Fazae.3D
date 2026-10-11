import type { Metadata } from "next";
import { Exo_2, Inter } from "next/font/google";
import { SessionProvider } from "next-auth/react";
import "./globals.css";
import { auth } from "@/auth";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site-config";

const exo2 = Exo_2({
  variable: "--font-exo2",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const SEO_TITLE = "Fazaê 3D | Impressão 3D em Natal e Parnamirim";
const DESCRIPTION =
  "Impressão 3D em Natal e Parnamirim: chaveiros, decoração e peças personalizadas, prontas ou sob encomenda. Entrega por motoboy na região e envio para todo o Brasil.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SEO_TITLE,
    template: `%s | ${SITE_NAME} 3D`,
  },
  description: DESCRIPTION,
  // Código de verificação do Google Search Console (opcional: também dá para verificar pelo DNS).
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: SITE_NAME,
    title: SEO_TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: SEO_TITLE,
    description: DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  return (
    <html lang="pt-BR" className={`${exo2.variable} ${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
