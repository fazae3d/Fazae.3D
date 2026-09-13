"use server";

import { getProduct } from "@/lib/demo-data";
import { withReadFallback } from "@/lib/db-fallback";
import { fallbackProducts } from "@/server/demo-fallback";
import { getSettings } from "@/server/repositories/settings-repository";
import { calculateShipping, type ShippingQuote } from "@/lib/melhor-envio";

export type ShippingQuoteInput = { productSlug: string; quantity: number };

/**
 * Shared by the PDP shipping widget and the checkout delivery step — resolves
 * origin CEP + product weight/dimensions/price server-side (never trusted
 * from the client) and asks Melhor Envio for real quotes. An empty array
 * means "fall back to the flat rate table", not an error — callers decide
 * what to render, this action never throws.
 */
export async function quoteShippingAction(
  destinationCep: string,
  items: ShippingQuoteInput[],
): Promise<ShippingQuote[]> {
  const digits = destinationCep.replace(/\D/g, "");
  if (digits.length !== 8 || items.length === 0) return [];

  const settings = await withReadFallback(() => getSettings(), { freeShippingThreshold: 299.9, whatsappNumber: "" });
  if (!settings.originCep) return [];

  const products = await Promise.all(
    items.map((item) =>
      withReadFallback(
        () => getProduct(item.productSlug),
        fallbackProducts.find((p) => p.slug === item.productSlug),
      ),
    ),
  );

  const quoteItems = items
    .map((item, index) => {
      const product = products[index];
      if (!product || product.price === undefined) return null;
      return {
        id: product.slug,
        weightGrams: product.weightGrams ?? null,
        widthCm: product.packageWidthCm ?? null,
        heightCm: product.packageHeightCm ?? null,
        lengthCm: product.packageLengthCm ?? null,
        unitPrice: product.price,
        quantity: item.quantity,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (quoteItems.length === 0) return [];

  const result = await calculateShipping({
    originCep: settings.originCep,
    destinationCep: digits,
    items: quoteItems,
  });

  return result.success ? result.quotes : [];
}
