import { round2 } from "@/lib/money";

/**
 * Pix "copia e cola" estático (BR Code do Banco Central): a chave da loja, o nome, a cidade e, se quiser, o valor. O QR code é só
 * esse texto desenhado. Quem paga confere o nome do recebedor no app do banco, que mostra o titular da chave.
 */

/** CRC16/CCITT-FALSE (polinômio 0x1021, início 0xFFFF), exigido no fim do BR Code. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

/** Sem acento, só letras, números e espaço, em maiúsculas (o padrão não aceita acento no nome e na cidade). */
export function pixText(value: string, max: number): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, max)
    .trim();
}

/** Identificador do pagamento (só letras e números, até 25): "ORC0007" ajuda a achar o pagamento no extrato. */
export function pixTxid(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Lê os campos de um trecho do BR Code (id → valor); para no primeiro campo malformado. */
function readFields(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  let i = 0;
  while (i + 4 <= text.length) {
    const id = text.slice(i, i + 2);
    const len = Number(text.slice(i + 2, i + 4));
    if (!Number.isInteger(len) || i + 4 + len > text.length) break;
    out[id] = text.slice(i + 4, i + 4 + len);
    i += 4 + len;
  }
  return out;
}

/** O texto colado parece um Pix "copia e cola" inteiro (começa com 000201) em vez de uma chave? */
export function looksLikeBrCode(text: string): boolean {
  return /^000201/.test(text.trim());
}

/** Tira a chave de dentro de um "copia e cola" de chave estática; devolve null quando o código não traz a chave (QR de maquininha, loja ou cobrança). */
export function pixKeyFromBrCode(text: string): string | null {
  const account = readFields(text.trim())["26"];
  const key = account ? readFields(account)["01"] : undefined;
  return key ? normalizePixKey(key) : null;
}

/** Deixa a chave no formato do Pix: CPF e CNPJ só com números, telefone com +55, e-mail e chave aleatória como estão. */
export function normalizePixKey(raw: string): string {
  const text = raw.trim();
  if (!text) return "";
  if (EMAIL.test(text)) return text.toLowerCase();
  if (UUID.test(text)) return text.toLowerCase();
  if (/^\+/.test(text)) return `+${text.replace(/\D/g, "")}`;
  if (/^[\d.\-/\s()]+$/.test(text)) {
    const digits = text.replace(/\D/g, "");
    // Telefone sem o +55 (10 ou 11 números) não se confunde com CPF (11) quando vem com parênteses ou espaço no DDD.
    if (/^\(/.test(text) && (digits.length === 10 || digits.length === 11)) return `+55${digits}`;
    return digits;
  }
  return text;
}

/** É uma chave Pix que o banco aceita (CPF, CNPJ, telefone, e-mail ou chave aleatória)? */
export function isValidPixKey(key: string): boolean {
  if (!key || key.length > 77) return false;
  return EMAIL.test(key) || UUID.test(key) || /^\+\d{10,15}$/.test(key) || /^\d{11}$/.test(key) || /^\d{14}$/.test(key);
}

export type PixInput = {
  key: string;
  /** Nome de quem recebe (até 25 letras). */
  name: string;
  /** Cidade de quem recebe (até 15 letras). */
  city: string;
  /** Valor em reais; sem valor, quem paga digita no banco. */
  amount?: number;
  /** Identificador do pagamento (ex.: ORC0007). */
  txid?: string;
};

/** Texto do Pix "copia e cola" (é o que vai dentro do QR code). */
export function pixPayload({ key, name, city, amount, txid }: PixInput): string {
  const account = tlv("26", tlv("00", "BR.GOV.BCB.PIX") + tlv("01", key));
  const value = amount !== undefined && amount > 0 ? tlv("54", round2(amount).toFixed(2)) : "";
  const body =
    tlv("00", "01") +
    tlv("01", "11") +
    account +
    tlv("52", "0000") +
    tlv("53", "986") +
    value +
    tlv("58", "BR") +
    tlv("59", pixText(name, 25) || "LOJA") +
    tlv("60", pixText(city, 15) || "BRASIL") +
    tlv("62", tlv("05", pixTxid(txid ?? "")));
  const withCrcId = `${body}6304`;
  return withCrcId + crc16(withCrcId);
}

export type QuotePix = {
  payload: string;
  key: string;
  /** Valor que o QR já cobra (0 = sem valor, o cliente digita). */
  amount: number;
  /** Quanto do total o QR cobra: 100 = o total, 50 = sinal de 50%. */
  pct: number;
  total: number;
  /** O que resta pagar depois do que o QR cobra. */
  remaining: number;
};

/**
 * Pix de um orçamento: o QR já vem com o valor do sinal ou com o total (a porcentagem escolhida no orçamento, ou a das Regras da loja);
 * com 0% vai sem valor e o cliente digita. Sem chave configurada, não há Pix no orçamento (devolve null).
 */
export function quotePix(
  quote: { number: number; total: number; pixDepositPct?: number; paymentMethod?: string },
  rules: { pix: { key: string; depositPct: number }; company: { legalName: string; city: string } },
): QuotePix | null {
  if (quote.paymentMethod === "cartao") return null;
  const key = rules.pix.key.trim();
  if (!key || !isValidPixKey(key) || !(quote.total > 0)) return null;
  // Cada orçamento pode escolher a sua porcentagem; sem escolha, vale a das Regras da loja.
  const pct = Math.min(100, Math.max(0, Math.round(quote.pixDepositPct ?? rules.pix.depositPct)));
  const amount = pct > 0 ? round2((quote.total * pct) / 100) : 0;
  const payload = pixPayload({
    key,
    name: rules.company.legalName,
    city: rules.company.city,
    amount: amount > 0 ? amount : undefined,
    txid: `ORC${String(quote.number).padStart(4, "0")}`,
  });
  return { payload, key, amount, pct, total: round2(quote.total), remaining: round2(Math.max(0, quote.total - amount)) };
}
