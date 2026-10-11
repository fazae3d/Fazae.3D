"use client";

import dynamic from "next/dynamic";

/**
 * Itens que não aparecem na primeira tela (gaveta do carrinho e aviso de cookies) carregam depois do conteúdo
 * principal, para a página ficar interativa mais cedo no celular. Não afeta SEO: nenhum deles tem texto que o Google precise ler.
 */
export const LazyCartDrawer = dynamic(() => import("./cart-drawer").then((m) => m.CartDrawer), { ssr: false });
export const LazyCookieConsent = dynamic(() => import("./cookie-consent").then((m) => m.CookieConsent), { ssr: false });
