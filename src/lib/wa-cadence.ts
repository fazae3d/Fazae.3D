import { storeDayKey, toStoreTime } from "@/lib/store-time";
import { normalizePhone } from "@/lib/whatsapp";

export type CadenceStep = { delayHours: number; text: string };

export const CADENCE_KINDS = [
  { key: "prospeccao", label: "Prospecção", description: "Primeiro contato com quem ainda não conhece a Fazaê (lista fria)." },
  { key: "orcamento", label: "Follow-up de orçamento", description: "Acompanha quem recebeu um orçamento e não respondeu." },
  { key: "pos_venda", label: "Pós-venda", description: "Depois da entrega: confirmar se chegou bem e pedir avaliação." },
  { key: "reativacao", label: "Reativação", description: "Chama de volta quem já comprou e sumiu." },
  { key: "personalizada", label: "Personalizada", description: "Você monta do zero." },
] as const;
export type CadenceKind = (typeof CADENCE_KINDS)[number]["key"];
export const kindLabel = (key: string) => CADENCE_KINDS.find((k) => k.key === key)?.label ?? "Personalizada";

/** Modelos para começar. O texto sempre pode ser editado; {{nome}} vira o primeiro nome e {Oi|Olá} sorteia uma das opções. */
export const CADENCE_PRESETS: Record<CadenceKind, { name: string; steps: CadenceStep[] }> = {
  prospeccao: {
    name: "Prospecção — 3 contatos",
    steps: [
      { delayHours: 0, text: "{Oi|Olá} {{nome}}! Aqui é da Fazaê 3D, a gente faz peças personalizadas em impressão 3D (chaveiros, brindes, displays e o que você imaginar). Posso te mostrar alguns exemplos?" },
      { delayHours: 48, text: "{Oi|Olá} {{nome}}, passando para ver se você chegou a ver minha mensagem. Se quiser, te mando um orçamento sem compromisso. É só dizer o que você precisa." },
      { delayHours: 96, text: "{{nome}}, vou deixar meu contato por aqui. Quando precisar de algo personalizado, é só chamar! Se não quiser mais receber mensagens, responda SAIR." },
    ],
  },
  orcamento: {
    name: "Follow-up de orçamento",
    steps: [
      { delayHours: 24, text: "{Oi|Olá} {{nome}}! Conseguiu dar uma olhada no orçamento que te enviei? Se quiser ajustar algo (quantidade, cor, prazo), eu resolvo por aqui." },
      { delayHours: 72, text: "{{nome}}, só lembrando que a condição do seu orçamento tem validade. Posso reservar a produção para você?" },
      { delayHours: 96, text: "Última mensagem sobre o orçamento, {{nome}}: se mudar de ideia é só me chamar que a gente retoma. Obrigado pela atenção!" },
    ],
  },
  pos_venda: {
    name: "Pós-venda e avaliação",
    steps: [
      { delayHours: 72, text: "{Oi|Olá} {{nome}}! Seu pedido da Fazaê 3D já chegou? Queria saber se está tudo certo com as peças." },
      { delayHours: 168, text: "{{nome}}, se você gostou do pedido, uma avaliação ajuda muito a gente a crescer. Leva menos de 1 minuto e você ainda ganha um cupom na próxima compra. Obrigado!" },
    ],
  },
  reativacao: {
    name: "Reativação de clientes",
    steps: [
      { delayHours: 0, text: "{Oi|Olá} {{nome}}, quanto tempo! Aqui é da Fazaê 3D. Tem novidades na loja e queria te mostrar. Está precisando de alguma peça?" },
      { delayHours: 168, text: "{{nome}}, separei uma condição especial para clientes que já compraram com a gente. Quer que eu te envie?" },
    ],
  },
  personalizada: { name: "Nova cadência", steps: [{ delayHours: 0, text: "{Oi|Olá} {{nome}}! " }] },
};

export const MAX_STEPS = 10;
export const MAX_STEP_TEXT = 1000;

/** Valida e normaliza os passos vindos do formulário (ou do banco). Devolve a lista limpa ou uma mensagem de erro. */
export function normalizeSteps(raw: unknown): { ok: true; steps: CadenceStep[] } | { ok: false; error: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { ok: false, error: "Adicione pelo menos uma mensagem." };
  if (raw.length > MAX_STEPS) return { ok: false, error: `No máximo ${MAX_STEPS} mensagens por cadência.` };
  const steps: CadenceStep[] = [];
  for (const [i, item] of raw.entries()) {
    const text = typeof (item as CadenceStep)?.text === "string" ? (item as CadenceStep).text.trim() : "";
    const delay = Number((item as CadenceStep)?.delayHours);
    if (!text) return { ok: false, error: `A mensagem ${i + 1} está vazia.` };
    if (text.length > MAX_STEP_TEXT) return { ok: false, error: `A mensagem ${i + 1} passa de ${MAX_STEP_TEXT} caracteres.` };
    if (!Number.isFinite(delay) || delay < 0 || delay > 24 * 60) return { ok: false, error: `O prazo da mensagem ${i + 1} é inválido.` };
    steps.push({ delayHours: Math.round(delay * 100) / 100, text });
  }
  return { ok: true, steps };
}

/** "ao entrar", "6 horas depois", "2 dias depois". */
export function describeDelay(hours: number, first = false) {
  if (hours <= 0) return first ? "logo ao entrar" : "logo em seguida";
  if (hours % 24 === 0) {
    const days = hours / 24;
    return `${days} dia${days > 1 ? "s" : ""} ${first ? "depois de entrar" : "depois"}`;
  }
  return `${hours} hora${hours > 1 ? "s" : ""} ${first ? "depois de entrar" : "depois"}`;
}

/**
 * Monta a mensagem de cada contato: {{nome}} vira o primeiro nome (e some, sem deixar sobra de pontuação, se não houver nome) e
 * {Oi|Olá|E aí} sorteia uma das opções. As variações evitam mandar o mesmo texto idêntico para muita gente.
 */
export function renderMessage(template: string, contact: { name?: string | null }, random: () => number = Math.random) {
  const first = (contact.name ?? "").trim().split(/\s+/)[0] ?? "";
  const withName = template.replace(/\{\{\s*nome\s*\}\}/gi, first);
  const spun = withName.replace(/\{([^{}|]+(?:\|[^{}|]*)+)\}/g, (_, options: string) => {
    const choices = options.split("|");
    return choices[Math.min(choices.length - 1, Math.floor(random() * choices.length))];
  });
  return spun
    .replace(/[ \t]+([,!.?:;])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .replace(/^[,;:\s]+/, "")
    .replace(/^./, (c) => c.toUpperCase());
}

const SEND_DAYS = new Set([1, 2, 3, 4, 5, 6]); // segunda a sábado

/** Dentro da janela de envio (segunda a sábado, no horário da loja)? */
export function isWithinSendWindow(now: Date, startHour: number, endHour: number) {
  const local = toStoreTime(now);
  if (!SEND_DAYS.has(local.getUTCDay())) return false;
  const hour = local.getUTCHours() + local.getUTCMinutes() / 60;
  return hour >= startHour && hour < endHour;
}

/** Aquecimento: o número começa com poucas mensagens por dia e sobe aos poucos até o teto configurado. */
export function effectiveDailyLimit(dailyLimit: number, firstSendDay: string | null, today: string) {
  if (!firstSendDay) return Math.min(dailyLimit, 20);
  const days = Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${firstSendDay}T00:00:00Z`)) / 86_400_000));
  return Math.min(dailyLimit, 20 + 15 * days);
}

export const storeToday = (now = new Date()) => storeDayKey(now);

/* ---------- importação de lista ---------- */

export type ImportRow = { name: string; phone: string };

const NAME_HEADERS = ["nome", "name", "cliente", "contato", "razao social", "empresa", "fantasia"];
const PHONE_HEADERS = ["telefone", "celular", "whatsapp", "whats", "fone", "phone", "tel", "numero", "contato"];

function plainHeader(text: unknown) {
  return String(text ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/** Descobre sozinho qual coluna é o nome e qual é o telefone pelo cabeçalho; sem cabeçalho conhecido, chuta pelo conteúdo. */
export function detectColumns(rows: unknown[][]): { nameCol: number; phoneCol: number; hasHeader: boolean } {
  const header = (rows[0] ?? []).map(plainHeader);
  const phoneByHeader = header.findIndex((h) => PHONE_HEADERS.some((p) => h === p || h.includes(p)));
  const nameByHeader = header.findIndex((h, i) => i !== phoneByHeader && NAME_HEADERS.some((n) => h === n || h.includes(n)));
  if (phoneByHeader >= 0) return { phoneCol: phoneByHeader, nameCol: nameByHeader >= 0 ? nameByHeader : phoneByHeader === 0 ? 1 : 0, hasHeader: true };

  const sample = rows.slice(0, 20);
  const width = Math.max(0, ...sample.map((r) => r.length));
  let best = 0;
  let bestHits = -1;
  for (let c = 0; c < width; c++) {
    const hits = sample.filter((r) => normalizePhone(String(r[c] ?? "")) !== null).length;
    if (hits > bestHits) {
      best = c;
      bestHits = hits;
    }
  }
  return { phoneCol: best, nameCol: best === 0 ? 1 : 0, hasHeader: false };
}

export type PreparedImport = {
  valid: ImportRow[];
  invalid: { line: number; value: string }[];
  duplicates: number;
};

/** Limpa as linhas: telefone normalizado (55 + DDD + número), inválidos separados e repetidos do arquivo removidos. */
export function prepareImportRows(rows: unknown[][], cols: { nameCol: number; phoneCol: number; hasHeader: boolean }): PreparedImport {
  const valid: ImportRow[] = [];
  const invalid: { line: number; value: string }[] = [];
  const seen = new Set<string>();
  let duplicates = 0;
  rows.forEach((row, index) => {
    if (cols.hasHeader && index === 0) return;
    const rawPhone = String(row[cols.phoneCol] ?? "").trim();
    const rawName = String(row[cols.nameCol] ?? "").trim();
    if (!rawPhone && !rawName) return;
    const phone = normalizePhone(rawPhone.replace(/\.0$/, ""));
    if (!phone) {
      invalid.push({ line: index + 1, value: rawPhone || rawName });
      return;
    }
    if (seen.has(phone)) {
      duplicates += 1;
      return;
    }
    seen.add(phone);
    valid.push({ name: rawName.slice(0, 120), phone });
  });
  return { valid, invalid, duplicates };
}

/** CSV simples (vírgula ou ponto e vírgula, aspas duplas). */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) && firstLine.includes(";") ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cell += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}
