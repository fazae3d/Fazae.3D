/** "84999998888" → "(84) 99999-8888" (celular) ou "(84) 3333-4444" (fixo). */
export function formatPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** "59064120" → "59064-120". */
export function formatCEP(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

/** DDD válido (11 a 99, sem 0 no início) + 8 ou 9 dígitos; celular de 11 dígitos começa com 9 depois do DDD. */
export function isValidBrPhone(value: string) {
  const d = value.replace(/\D/g, "");
  if (d.length !== 10 && d.length !== 11) return false;
  if (d[0] === "0" || d[1] === "0") return false;
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}

export const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;
