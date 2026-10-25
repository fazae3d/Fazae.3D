/** "Como nos conheceu": de onde veio o cliente. Escolhido ao cadastrar a venda; mostra qual canal traz gente de verdade. */
export const CUSTOMER_SOURCES: { value: string; label: string }[] = [
  { value: "instagram", label: "Instagram" },
  { value: "indicacao", label: "Indicação de amigo ou cliente" },
  { value: "presencial", label: "Feira, evento ou loja física" },
  { value: "google", label: "Google" },
  { value: "whatsapp", label: "WhatsApp direto" },
  { value: "site", label: "Site" },
  { value: "outro", label: "Outro" },
];

export function customerSourceLabel(source?: string | null) {
  return CUSTOMER_SOURCES.find((s) => s.value === source)?.label ?? "Não informado";
}

export function isCustomerSource(value: unknown): value is string {
  return typeof value === "string" && CUSTOMER_SOURCES.some((s) => s.value === value);
}

/** Quantos clientes vieram de cada origem (mais frequentes primeiro); quem não tem origem entra em "Não informado". */
export function sourceBreakdown(customers: { source?: string | null }[]): { value: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const c of customers) {
    const key = isCustomerSource(c.source) ? c.source : "";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([value, count]) => ({ value, label: customerSourceLabel(value), count }))
    .sort((a, b) => b.count - a.count);
}
