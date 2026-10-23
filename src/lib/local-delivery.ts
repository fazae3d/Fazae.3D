import type { StoreSettings } from "@/server/types";
import { DEFAULT_RULES, localDeliveryLabels, type StoreRules } from "@/lib/store-rules";

/** Entrega própria (motoboy), só para as cidades configuradas. Valores abaixo são o padrão; o painel (Configurações e Regras da loja) sobrescreve. */
export const DEFAULT_LOCAL_DELIVERY_THRESHOLD = 49.9;
export const DEFAULT_LOCAL_DELIVERY_FEE = 12;

export type LocalDeliveryRules = {
  threshold: number;
  fee: number;
  /** Cidades atendidas e estado (sigla), para conferir o CEP do cliente. */
  cities: string[];
  state: string;
  /** "Natal e Parnamirim", "Entrega em Natal e Parnamirim" e "Entrega em até 48h", já montados. */
  citiesLabel: string;
  label: string;
  eta: string;
};

type LocalDeliverySettings = Partial<Pick<StoreSettings, "localDeliveryThreshold" | "localDeliveryFee">> & {
  rules?: Pick<StoreRules, "localDelivery">;
};

export function getLocalDeliveryRules(settings: LocalDeliverySettings): LocalDeliveryRules {
  const rules = settings.rules ?? DEFAULT_RULES;
  return {
    threshold: settings.localDeliveryThreshold ?? DEFAULT_LOCAL_DELIVERY_THRESHOLD,
    fee: settings.localDeliveryFee ?? DEFAULT_LOCAL_DELIVERY_FEE,
    cities: rules.localDelivery.cities,
    state: rules.localDelivery.state,
    ...localDeliveryLabels(rules),
  };
}

/** Grátis a partir do mínimo; abaixo dele, a taxa fixa do motoboy. */
export function localDeliveryCost(subtotal: number, rules: Pick<LocalDeliveryRules, "threshold" | "fee">) {
  return subtotal >= rules.threshold ? 0 : rules.fee;
}

function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

export function isLocalDeliveryCity(
  city: string | undefined,
  state: string | undefined,
  area: Pick<LocalDeliveryRules, "cities" | "state"> = { cities: DEFAULT_RULES.localDelivery.cities, state: DEFAULT_RULES.localDelivery.state },
) {
  if (!city || !state) return false;
  return normalize(state) === normalize(area.state) && area.cities.some((c) => normalize(c) === normalize(city));
}
