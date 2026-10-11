import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/announcement-bar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartDrawer } from "@/components/cart-drawer";
import { WhatsAppFloatButton } from "@/components/whatsapp-float-button";
import { CookieConsent } from "@/components/cookie-consent";
import { CartProvider } from "@/contexts/cart-context";
import { PixDiscountProvider } from "@/contexts/pix-discount-context";
import { MenuCategoriesProvider } from "@/contexts/menu-categories-context";
import { getAllCategories } from "@/lib/demo-data";
import { CATEGORIES } from "@/lib/categories";
import { withReadFallback } from "@/lib/db-fallback";
import { DEFAULT_PIX_DISCOUNT_PCT } from "@/lib/money";
import { getSettings } from "@/server/repositories/settings-repository";
import { WishlistProvider } from "@/contexts/wishlist-context";
import { COMPANY, INSTAGRAM_URL, SITE_NAME, SITE_URL } from "@/lib/site-config";
import { JsonLd } from "@/components/json-ld";

/** Loja física/online com endereço e área de atendimento: ajuda o Google a mostrar a Fazaê em buscas locais ("impressão 3D Natal"). */
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Store",
  name: `${SITE_NAME} 3D`,
  legalName: COMPANY.legalName,
  url: SITE_URL,
  logo: `${SITE_URL}/logo-email.png`,
  image: `${SITE_URL}/opengraph-image`,
  description:
    "Impressão 3D em Natal e Parnamirim: peças prontas e sob encomenda, do funcional ao decorativo. Você imagina, a gente cria.",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Rua Luís Nogueira Filho, 419",
    addressLocality: "Parnamirim",
    addressRegion: "RN",
    postalCode: COMPANY.zip,
    addressCountry: "BR",
  },
  areaServed: [
    { "@type": "City", name: "Natal" },
    { "@type": "City", name: "Parnamirim" },
    { "@type": "Country", name: "Brasil" },
  ],
  sameAs: [INSTAGRAM_URL],
  ...(COMPANY.cnpj ? { taxID: COMPANY.cnpj } : {}),
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/busca?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

export default async function StorefrontLayout({ children }: { children: ReactNode }) {
  const pixDiscountPct = await withReadFallback(
    async () => (await getSettings()).pixDiscountPct ?? DEFAULT_PIX_DISCOUNT_PCT,
    DEFAULT_PIX_DISCOUNT_PCT,
  );
  const menuCategories = await withReadFallback(
    async () => (await getAllCategories()).map((c) => ({ slug: c.slug, label: c.name })),
    CATEGORIES.map((c) => ({ slug: c.slug, label: c.label })),
  );
  return (
    <MenuCategoriesProvider categories={menuCategories}>
    <PixDiscountProvider pct={pixDiscountPct}>
    <CartProvider>
      <WishlistProvider>
        <JsonLd data={ORGANIZATION_JSON_LD} />
        <JsonLd data={WEBSITE_JSON_LD} />
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-[0.15]"
          style={{ backgroundImage: "url(/bg-texture.webp)" }}
        />
        <div className="flex min-h-full flex-col">
          <AnnouncementBar />
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
        <CartDrawer />
        <WhatsAppFloatButton />
        <CookieConsent />
      </WishlistProvider>
    </CartProvider>
    </PixDiscountProvider>
    </MenuCategoriesProvider>
  );
}
