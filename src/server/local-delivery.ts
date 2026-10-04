import { isLocalDeliveryCity } from "@/lib/local-delivery";

type ViaCepResponse = { localidade?: string; uf?: string; erro?: boolean | string };

/**
 * Whether a CEP belongs to a city served by our own motoboy. The city is looked
 * up server-side from the CEP (never taken from the form), so the free
 * delivery can't be unlocked by typing "Natal" next to another city's CEP.
 * Fails closed — any lookup problem simply means "not eligible".
 */
export async function isLocalDeliveryCep(cep: string): Promise<boolean> {
  const digits = cep.replace(/\D/g, "");
  if (digits.length !== 8) return false;
  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: AbortSignal.timeout(4000),
      next: { revalidate: 86400 },
    });
    if (!response.ok) return false;
    const data: ViaCepResponse = await response.json();
    if (data.erro) return false;
    return isLocalDeliveryCity(data.localidade, data.uf);
  } catch {
    return false;
  }
}
