import { getAllProducts } from "@/lib/demo-data";
import { isSoldOut } from "@/lib/badges";
import { SITE_URL } from "@/lib/site-config";

export const revalidate = 3600;

/**
 * Produtos que as políticas do Google Shopping não aceitam (armas e acessórios de arma, como porta-munição): ficam fora do feed
 * para não reprovar ou suspender a conta do Merchant Center. Continuam à venda normalmente na loja.
 */
const EXCLUDED_FROM_FEED = new Set(["porta-municao"]);
const EXCLUDED_NAME_PATTERN = /muni[cç][aã]o|arma|armas|pistola|revolver|rev[oó]lver/i;

const xml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const absolute = (url: string) => (url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`);

/**
 * Feed de produtos para o Google Merchant Center (aparecer gratuitamente na aba Shopping e nos resultados de produtos).
 * Cadastre esta URL em merchants.google.com > Produtos > Feeds. Só entram produtos com preço e foto.
 */
export async function GET() {
  let products: Awaited<ReturnType<typeof getAllProducts>> = [];
  try {
    products = await getAllProducts();
  } catch (error) {
    console.error("[merchant-feed] falha ao ler o catálogo", error);
    return new Response("Catálogo indisponível", { status: 503 });
  }

  const items = products
    .filter((p) => p.price !== undefined && p.images && p.images.length > 0)
    .filter((p) => !EXCLUDED_FROM_FEED.has(p.slug) && !EXCLUDED_NAME_PATTERN.test(p.name))
    .map((p) => {
      const description = p.description.replace(/\s+/g, " ").trim().slice(0, 4900);
      const extra = (p.images ?? [])
        .slice(1, 10)
        .map((img) => `<g:additional_image_link>${xml(absolute(img))}</g:additional_image_link>`)
        .join("");
      return `<item>
<g:id>${xml(p.slug)}</g:id>
<g:title>${xml(`${p.name} - impressão 3D`.slice(0, 150))}</g:title>
<g:description>${xml(description || p.name)}</g:description>
<g:link>${xml(`${SITE_URL}/produto/${p.slug}`)}</g:link>
<g:image_link>${xml(absolute(p.images![0]))}</g:image_link>${extra}
<g:availability>${isSoldOut(p) ? "out_of_stock" : "in_stock"}</g:availability>
<g:price>${p.price!.toFixed(2)} BRL</g:price>${
        p.compareAtPrice && p.compareAtPrice > p.price! ? `
<g:sale_price>${p.price!.toFixed(2)} BRL</g:sale_price>` : ""
      }
<g:brand>Fazaê</g:brand>
<g:condition>new</g:condition>
<g:identifier_exists>no</g:identifier_exists>
<g:product_type>${xml(p.categoryName)}</g:product_type>${p.weightGrams ? `
<g:shipping_weight>${p.weightGrams} g</g:shipping_weight>` : ""}
</item>`;
    });

  const feed = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
<channel>
<title>Fazaê 3D</title>
<link>${SITE_URL}</link>
<description>Peças impressas em 3D: chaveiros, decoração e utilidades.</description>
${items.join("\n")}
</channel>
</rss>
`;

  return new Response(feed, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
