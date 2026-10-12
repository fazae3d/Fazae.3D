import type { MetadataRoute } from "next";
import { getAllCategories, getAllProducts } from "@/lib/demo-data";
import { SITE_URL } from "@/lib/site-config";
import { publicCategories, publicProducts } from "@/lib/visibility";

const STATIC_ROUTES: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/loja", priority: 0.9, changeFrequency: "daily" },
  { path: "/personalizado", priority: 0.8, changeFrequency: "weekly" },
  { path: "/impressao-3d/natal", priority: 0.8, changeFrequency: "monthly" },
  { path: "/impressao-3d/parnamirim", priority: 0.8, changeFrequency: "monthly" },
  { path: "/guias", priority: 0.6, changeFrequency: "weekly" },
  { path: "/guias/pla-ou-petg-qual-material-escolher", priority: 0.6, changeFrequency: "monthly" },
  { path: "/guias/presentes-personalizados-em-3d", priority: 0.6, changeFrequency: "monthly" },
  { path: "/guias/como-cuidar-de-pecas-impressas-em-3d", priority: 0.6, changeFrequency: "monthly" },
  { path: "/sobre", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contato", priority: 0.4, changeFrequency: "yearly" },
  { path: "/faq", priority: 0.4, changeFrequency: "monthly" },
  { path: "/trocas-e-devolucoes", priority: 0.3, changeFrequency: "yearly" },
  { path: "/privacidade", priority: 0.2, changeFrequency: "yearly" },
  { path: "/termos", priority: 0.2, changeFrequency: "yearly" },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries = STATIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  const [categories, products] = await Promise.all([
    getAllCategories().catch(() => []),
    getAllProducts().catch(() => []),
  ]);

  const categoryEntries = publicCategories(categories).map((category) => ({
    url: `${SITE_URL}/categorias/${category.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const productEntries = publicProducts(products).map((product) => ({
    url: `${SITE_URL}/produto/${product.slug}`,
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries];
}
