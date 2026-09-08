/** Standard mod-11 CPF checksum — the two verification digits are derived from the first 9. */
function calcCheckDigit(digits: number[]): number {
  let sum = 0;
  let weight = digits.length + 1;
  for (const d of digits) {
    sum += d * weight;
    weight--;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, "");
  // Reject sequences like "000.000.000-00" — they pass the checksum
  // (all-same-digit CPFs are a well-known degenerate case) but aren't real.
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number);
  const d1 = calcCheckDigit(digits.slice(0, 9));
  if (d1 !== digits[9]) return false;

  const d2 = calcCheckDigit(digits.slice(0, 10));
  return d2 === digits[10];
}

export function formatCPF(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
