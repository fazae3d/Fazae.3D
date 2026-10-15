import { withReadFallback } from "@/lib/db-fallback";
import { getAllProducts } from "@/lib/demo-data";
import { fallbackProducts } from "@/server/demo-fallback";
import { getAllCustomers } from "@/server/repositories/customer-repository";
import type { QuoteCustomerOption, QuoteProductOption } from "@/components/admin/quote-form";

/** Catálogo e clientes cadastrados, para preencher o orçamento com poucos cliques. */
export async function loadQuoteFormOptions(): Promise<{ products: QuoteProductOption[]; customers: QuoteCustomerOption[] }> {
  const [products, customers] = await Promise.all([
    withReadFallback(() => getAllProducts(), fallbackProducts),
    withReadFallback(() => getAllCustomers(), []),
  ]);
  return {
    products: products
      .map((p) => ({ slug: p.slug, name: p.name, price: p.price }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    customers: customers.map((c) => ({ name: c.name, phone: c.phone, email: c.email })),
  };
}
