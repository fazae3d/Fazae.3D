import type { ReactNode } from "react";
import { AnnouncementBar } from "@/components/announcement-bar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { LazyCartDrawer, LazyCookieConsent } from "@/components/lazy-widgets";
import { WhatsAppFloatButton } from "@/components/whatsapp-float-button";
import { CartProvider } from "@/contexts/cart-context";
import { PixDiscountProvider } from "@/contexts/pix-discount-context";
import { MenuCategoriesProvider } from "@/contexts/menu-categories-context";
import { getAllCategories } from "@/lib/demo-data";
import { CATEGORIES } from "@/lib/categories";
import { publicCategories } from "@/lib/visibility";
import { withReadFallback } from "@/lib/db-fallback";
import { DEFAULT_PIX_DISCOUNT_PCT } from "@/lib/money";
import { getSettings } from "@/server/repositories/settings-repository";
import { WishlistProvider } from "@/contexts/wishlist-context";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import { DEFAULT_RULES, joinNames, publicRules, type StoreRules } from "@/lib/store-rules";
import { StoreRulesProvider } from "@/contexts/store-rules-context";
import { getStoreRules } from "@/server/store-rules";
import { JsonLd } from "@/components/json-ld";

/**
 * Vitrine servida da CDN e regenerada em segundo plano a cada 60 s: preço, estoque e novidades aparecem em até 1 minuto,
 * e as ações do painel (editar produto/estoque) ainda forçam a atualização na hora.
 */
export const revalidate = 60;

/** Loja física/online com endereço e área de atendimento: ajuda o Google a mostrar a Fazaê em buscas locais ("impressão 3D Natal"). */
function organizationJsonLd(rules: StoreRules) {
  const { company, localDelivery } = rules;
  return {
    "@context": "https://schema.org",
    "@type": "Store",
    name: `${SITE_NAME} 3D`,
    legalName: company.legalName,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-email.png`,
    image: `${SITE_URL}/opengraph-image`,
    description: `Impressão 3D em ${joinNames(localDelivery.cities)}: peças prontas e sob encomenda, do funcional ao decorativo. ${company.tagline}`,
    address: {
      "@type": "PostalAddress",
      streetAddress: company.street,
      addressLocality: company.city,
      addressRegion: company.state,
      postalCode: company.zip,
      addressCountry: "BR",
    },
    areaServed: [...localDelivery.cities.map((name) => ({ "@type": "City", name })), { "@type": "Country", name: "Brasil" }],
    sameAs: [company.instagramUrl],
    ...(company.cnpj ? { taxID: company.cnpj } : {}),
  };
}

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
  const rules = await getStoreRules().catch(() => DEFAULT_RULES);
  const pixDiscountPct = await withReadFallback(
    async () => (await getSettings()).pixDiscountPct ?? DEFAULT_PIX_DISCOUNT_PCT,
    DEFAULT_PIX_DISCOUNT_PCT,
  );
  const menuCategories = await withReadFallback(
    async () => publicCategories(await getAllCategories()).map((c) => ({ slug: c.slug, label: c.name })),
    CATEGORIES.map((c) => ({ slug: c.slug, label: c.label })),
  );
  return (
    <MenuCategoriesProvider categories={menuCategories}>
    <PixDiscountProvider pct={pixDiscountPct}>
    <StoreRulesProvider rules={publicRules(rules)}>
    <CartProvider>
      <WishlistProvider>
        <JsonLd data={organizationJsonLd(rules)} />
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
        <LazyCartDrawer />
        <WhatsAppFloatButton />
        <LazyCookieConsent />
      </WishlistProvider>
    </CartProvider>
    </StoreRulesProvider>
    </PixDiscountProvider>
    </MenuCategoriesProvider>
  );
}
