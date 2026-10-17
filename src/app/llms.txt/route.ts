import { COMPANY, SITE_URL } from "@/lib/site-config";

export const dynamic = "force-static";

/** Resumo da loja para assistentes de IA (convenção llms.txt): quem somos, o que vendemos e onde ficam as informações. */
export function GET() {
  const body = `# Fazaê 3D

> Loja de impressão 3D em Parnamirim/RN: chaveiros, decoração, itens geek e utilidades, prontos ou sob encomenda. Entrega em até 48h em Natal e Parnamirim e envio para todo o Brasil.

Endereço: ${COMPANY.address}, CEP ${COMPANY.zip}

## Principais páginas
- [Loja (catálogo completo)](${SITE_URL}/loja): produtos impressos em 3D com preço e disponibilidade
- [Peça personalizada sob encomenda](${SITE_URL}/personalizado): orçamento de peças únicas
- [Impressão 3D em Natal/RN](${SITE_URL}/impressao-3d/natal)
- [Impressão 3D em Parnamirim/RN](${SITE_URL}/impressao-3d/parnamirim)
- [Guias sobre impressão 3D](${SITE_URL}/guias): materiais, presentes personalizados e cuidados com as peças
- [Perguntas frequentes](${SITE_URL}/faq): prazos, pagamento, frete e trocas
- [Trocas e devoluções](${SITE_URL}/trocas-e-devolucoes)
- [Sobre a Fazaê](${SITE_URL}/sobre)
- [Contato](${SITE_URL}/contato)

## Dados úteis
- Pagamento: Pix (com desconto), cartão e boleto
- Feed de produtos: ${SITE_URL}/merchant-feed.xml
- Sitemap: ${SITE_URL}/sitemap.xml
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, s-maxage=86400" } });
}
