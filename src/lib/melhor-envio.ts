const BASE_URL =
  process.env.MELHOR_ENVIO_SANDBOX === "true" ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br";

/** Correios' own package minimums — applied per item so a product missing weight/dimensions never breaks the quote. */
const MIN_WEIGHT_KG = 0.3;
const MIN_DIMENSION_CM = 16;
const MIN_HEIGHT_CM = 2;

export type ShippingQuoteItem = {
  id: string;
  weightGrams: number | null;
  widthCm: number | null;
  heightCm: number | null;
  lengthCm: number | null;
  unitPrice: number;
  quantity: number;
};

export type ShippingQuote = {
  id: number;
  name: string;
  company: string;
  price: number;
  deliveryDays: number;
};

export type ShippingQuoteResult = { success: true; quotes: ShippingQuote[] } | { success: false; error: string };

type MelhorEnvioServiceResponse = {
  id: number;
  name: string;
  price?: string;
  custom_price?: string;
  delivery_time?: number;
  custom_delivery_time?: number;
  company?: { name?: string };
  error?: string;
};

function toKg(weightGrams: number | null) {
  return Math.max(MIN_WEIGHT_KG, (weightGrams ?? 0) / 1000);
}

/**
 * Sends one `products` entry per cart line, letting Melhor Envio compute
 * the ideal packaging itself instead of us doing manual box-packing math.
 */
export async function calculateShipping({
  originCep,
  destinationCep,
  items,
}: {
  originCep: string;
  destinationCep: string;
  items: ShippingQuoteItem[];
}): Promise<ShippingQuoteResult> {
  const token = process.env.MELHOR_ENVIO_TOKEN;
  if (!token) {
    console.warn("[melhor-envio] MELHOR_ENVIO_TOKEN não configurado — cotação de frete não realizada.");
    return { success: false, error: "Cotação de frete não configurada." };
  }

  try {
    const response = await fetch(`${BASE_URL}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Fazae 3D (contato@fazae3d.com.br)",
      },
      body: JSON.stringify({
        from: { postal_code: originCep.replace(/\D/g, "") },
        to: { postal_code: destinationCep.replace(/\D/g, "") },
        products: items.map((item) => ({
          id: item.id,
          width: Math.max(MIN_DIMENSION_CM, item.widthCm ?? 0),
          height: Math.max(MIN_HEIGHT_CM, item.heightCm ?? 0),
          length: Math.max(MIN_DIMENSION_CM, item.lengthCm ?? 0),
          weight: toKg(item.weightGrams),
          insurance_value: item.unitPrice,
          quantity: item.quantity,
        })),
      }),
    });

    if (!response.ok) {
      console.error("[melhor-envio] falha ao cotar frete", response.status, await response.text());
      return { success: false, error: "Não foi possível cotar o frete agora." };
    }

    const data = (await response.json()) as MelhorEnvioServiceResponse[];
    const quotes = data
      .filter((service) => !service.error && (service.price ?? service.custom_price))
      .map((service) => ({
        id: service.id,
        name: service.name,
        company: service.company?.name ?? "",
        price: Number(service.custom_price ?? service.price),
        deliveryDays: service.custom_delivery_time ?? service.delivery_time ?? 0,
      }))
      .sort((a, b) => a.price - b.price);

    return { success: true, quotes };
  } catch (error) {
    console.error("[melhor-envio] falha ao cotar frete", error);
    return { success: false, error: "Não foi possível cotar o frete agora." };
  }
}
