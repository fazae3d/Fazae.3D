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

/** Mod-11 CNPJ checksum, same shape as calcCheckDigit but with the CNPJ's own weight cycle (2..9, repeating). */
function calcCnpjCheckDigit(digits: number[]): number {
  const weights = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2].slice(-digits.length);
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCNPJ(raw: string): boolean {
  const cnpj = raw.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digits = cnpj.split("").map(Number);
  const d1 = calcCnpjCheckDigit(digits.slice(0, 12));
  if (d1 !== digits[12]) return false;

  const d2 = calcCnpjCheckDigit(digits.slice(0, 13));
  return d2 === digits[13];
}

export function formatCNPJ(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 14);
  return digits
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

/** Formats as CPF while the digits still fit (≤11), then switches to CNPJ formatting — for a single "documento" field accepting either. */
export function formatDocument(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  return digits.length > 11 ? formatCNPJ(raw) : formatCPF(raw);
}

export function isValidDocument(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 14 ? isValidCNPJ(raw) : isValidCPF(raw);
}
