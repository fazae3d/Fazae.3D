import type { StoreSettings } from "@/server/types";

/** Entrega própria (motoboy) — só para estas cidades do RN. Valores abaixo são o padrão; o painel (Configurações) sobrescreve. */
export const DEFAULT_LOCAL_DELIVERY_THRESHOLD = 49.9;
export const DEFAULT_LOCAL_DELIVERY_FEE = 12;
export const LOCAL_DELIVERY_LABEL = "Entrega própria (Motoboy)";
export const LOCAL_DELIVERY_ETA = "Entrega por motoboy em até 48h";
export const LOCAL_DELIVERY_CITIES_LABEL = "Natal e Parnamirim";

export type LocalDeliveryRules = { threshold: number; fee: number };

export function getLocalDeliveryRules(
  settings: Pick<StoreSettings, "localDeliveryThreshold" | "localDeliveryFee">,
): LocalDeliveryRules {
  return {
    threshold: settings.localDeliveryThreshold ?? DEFAULT_LOCAL_DELIVERY_THRESHOLD,
    fee: settings.localDeliveryFee ?? DEFAULT_LOCAL_DELIVERY_FEE,
  };
}

/** Grátis a partir do mínimo; abaixo dele, a taxa fixa do motoboy. */
export function localDeliveryCost(subtotal: number, rules: LocalDeliveryRules) {
  return subtotal >= rules.threshold ? 0 : rules.fee;
}

const LOCAL_DELIVERY_CITIES = ["natal", "parnamirim"];

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function isLocalDeliveryCity(city: string | undefined, state: string | undefined) {
  if (!city || !state) return false;
  return normalize(state) === "rn" && LOCAL_DELIVERY_CITIES.includes(normalize(city));
}
