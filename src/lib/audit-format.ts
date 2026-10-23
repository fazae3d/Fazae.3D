/**
 * Regras puras da auditoria: o que é registrado, como comparar antes e depois e como mostrar cada mudança em português.
 * (Sem banco nem rede: usado pelo registro automático, pela página Atividade e pelos testes.)
 */

import { RULE_FIELDS, getPath, parseStoreRules } from "@/lib/store-rules";

export type Row = Record<string, unknown>;
export type AuditChange = { field: string; from: unknown; to: unknown };

type ModelInfo = {
  label: string;
  pk: "id" | "slug" | "code";
  /** Campo com o nome legível do registro (aparece no título da linha). */
  nameField?: string;
  /** Dá para desfazer uma edição desse tipo pelo painel. */
  restorableUpdate: boolean;
  /** Dá para recriar o registro se ele foi excluído. */
  restorableDelete: boolean;
};

/** Tudo que é cadastro ou regra do painel: cada criação, edição e exclusão é registrada sozinha, com antes e depois. */
export const AUDITED_MODELS: Record<string, ModelInfo> = {
  Product: { label: "Produto", pk: "slug", nameField: "name", restorableUpdate: true, restorableDelete: false },
  Category: { label: "Categoria", pk: "slug", nameField: "name", restorableUpdate: true, restorableDelete: true },
  Coupon: { label: "Cupom", pk: "code", nameField: "code", restorableUpdate: true, restorableDelete: true },
  Settings: { label: "Configurações da loja", pk: "id", restorableUpdate: true, restorableDelete: false },
  Material: { label: "Material", pk: "slug", nameField: "name", restorableUpdate: true, restorableDelete: true },
  RawMaterial: { label: "Insumo", pk: "id", nameField: "name", restorableUpdate: true, restorableDelete: true },
  AdditionalCost: { label: "Custo extra", pk: "id", nameField: "name", restorableUpdate: true, restorableDelete: true },
  Expense: { label: "Gasto", pk: "id", nameField: "description", restorableUpdate: true, restorableDelete: true },
  Customer: { label: "Cliente", pk: "id", nameField: "name", restorableUpdate: true, restorableDelete: false },
  Consignee: { label: "Lojista", pk: "id", nameField: "name", restorableUpdate: true, restorableDelete: false },
  ConsignmentItem: { label: "Peças com o lojista", pk: "id", restorableUpdate: false, restorableDelete: false },
  ConsignmentVisit: { label: "Visita ao lojista", pk: "id", restorableUpdate: false, restorableDelete: false },
  WaCadence: { label: "Cadência", pk: "id", nameField: "name", restorableUpdate: true, restorableDelete: false },
  WaQuickReply: { label: "Resposta rápida", pk: "id", nameField: "title", restorableUpdate: true, restorableDelete: true },
  WaConfig: { label: "Regras do WhatsApp", pk: "id", restorableUpdate: true, restorableDelete: false },
  ProductionItem: { label: "Item de produção", pk: "id", nameField: "description", restorableUpdate: true, restorableDelete: true },
  Review: { label: "Avaliação", pk: "id", restorableUpdate: true, restorableDelete: false },
  CustomOrderRequest: { label: "Pedido de encomenda", pk: "id", nameField: "name", restorableUpdate: true, restorableDelete: false },
  Campaign: { label: "Campanha de e-mail", pk: "id", nameField: "subject", restorableUpdate: false, restorableDelete: false },
};

export const isAuditedModel = (model: string) => model in AUDITED_MODELS;
export const modelLabel = (model: string) => AUDITED_MODELS[model]?.label ?? model;

/** Campos que nunca entram na comparação (mudam sozinhos ou são só técnicos). */
const IGNORED_FIELDS = new Set(["updatedAt", "createdAt", "lastWebhookAt"]);
/** Campos secretos: a mudança é registrada, mas o valor nunca é guardado. */
const MASKED_FIELDS = new Set(["passwordHash", "resetToken", "token", "mpPaymentId", "secret"]);
const MASK = "(oculto)";
const MAX_VALUE_CHARS = 1500;

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "bigint") return value.toString();
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value as Row).map(([k, v]) => [k, normalize(v)]));
  return value;
}

/** Cópia do registro pronta para guardar: datas em texto, segredos ocultos, textos gigantes cortados. */
export function snapshotRow(row: Row | null | undefined): Row | null {
  if (!row) return null;
  const out: Row = {};
  for (const [key, raw] of Object.entries(row)) {
    if (MASKED_FIELDS.has(key)) {
      out[key] = raw === null || raw === undefined || raw === "" ? raw : MASK;
      continue;
    }
    const value = normalize(raw);
    if (key === "rules") {
      out[key] = value;
      continue;
    }
    const text = typeof value === "string" ? value : JSON.stringify(value);
    out[key] = text && text.length > MAX_VALUE_CHARS ? `${text.slice(0, MAX_VALUE_CHARS)}…` : value;
  }
  return out;
}

const same = (a: unknown, b: unknown) => JSON.stringify(normalize(a)) === JSON.stringify(normalize(b));

/** Prefixo dos campos das Regras da loja ("rules.shipping.standardCost"): o JSON é aberto regra por regra para mostrar e desfazer cada uma. */
export const RULES_PREFIX = "rules.";

/** Regras que mudaram entre o antes e o depois (cada uma com o valor completo, já com os padrões aplicados). */
function diffRules(before: unknown, after: unknown): AuditChange[] {
  if ((before === null || before === undefined) && (after === null || after === undefined)) return [];
  const b = parseStoreRules(before);
  const a = parseStoreRules(after);
  return RULE_FIELDS.flatMap((spec) => {
    const from = getPath(b, spec.path);
    const to = getPath(a, spec.path);
    return same(from, to) ? [] : [{ field: RULES_PREFIX + spec.path, from, to }];
  });
}

/** O que mudou entre o antes e o depois (só campos relevantes). */
export function diffRows(before: Row | null, after: Row | null): AuditChange[] {
  const b = snapshotRow(before) ?? {};
  const a = snapshotRow(after) ?? {};
  const changes: AuditChange[] = [];
  for (const field of new Set([...Object.keys(b), ...Object.keys(a)])) {
    if (IGNORED_FIELDS.has(field)) continue;
    if (field === "rules") {
      changes.push(...diffRules(b[field], a[field]));
      continue;
    }
    if (!same(b[field], a[field])) changes.push({ field, from: b[field] ?? null, to: a[field] ?? null });
  }
  return changes;
}

/** Na criação ou exclusão, lista os campos preenchidos (sem os técnicos). */
export function filledFields(row: Row | null, direction: "to" | "from"): AuditChange[] {
  const snap = snapshotRow(row) ?? {};
  return Object.entries(snap)
    .filter(([field, value]) => !IGNORED_FIELDS.has(field) && field !== "rules" && value !== null && value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0))
    .map(([field, value]) => (direction === "to" ? { field, from: null, to: value } : { field, from: value, to: null }));
}

export function rowKey(model: string, row: Row | null | undefined, where?: Row): string {
  const info = AUDITED_MODELS[model];
  const fromRow = row?.[info?.pk ?? "id"];
  if (fromRow !== undefined && fromRow !== null) return String(fromRow);
  if (where) {
    const w = where[info?.pk ?? "id"];
    if (w !== undefined && w !== null) return String(w);
    return JSON.stringify(where).slice(0, 80);
  }
  return "?";
}

export function rowName(model: string, row: Row | null | undefined): string | null {
  const field = AUDITED_MODELS[model]?.nameField;
  const value = field ? row?.[field] : undefined;
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 80) : null;
}

/* ---------- apresentação em português ---------- */

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  price: "Preço",
  compareAtPrice: "Preço antes da oferta",
  stock: "Estoque",
  type: "Tipo",
  description: "Descrição",
  shortDescription: "Descrição curta",
  isNew: "Marcado como novidade",
  isBestSeller: "Marcado como mais vendido",
  images: "Fotos",
  slug: "Endereço (slug)",
  active: "Ativo",
  hidden: "Oculto",
  code: "Código",
  value: "Valor",
  minSubtotal: "Compra mínima",
  usageLimit: "Limite de usos",
  freeShippingThreshold: "Frete grátis para todo o Brasil a partir de",
  whatsappNumber: "Número de WhatsApp",
  whatsappMessageTemplate: "Mensagem padrão do WhatsApp",
  customOrderIntroText: "Texto da página de peça personalizada",
  originCep: "CEP de origem",
  defaultProfitMarginPct: "Margem de lucro padrão",
  averageFailureRatePct: "Taxa média de falha",
  printerCostPerHour: "Custo da impressora por hora",
  energyCostPerHour: "Custo de energia por hora",
  defaultMaterialCostPerGram: "Custo do material por grama",
  localDeliveryThreshold: "Entrega local: frete grátis a partir de",
  localDeliveryFee: "Entrega local: taxa abaixo do mínimo",
  pixDiscountPct: "Desconto no Pix",
  channelFees: "Taxas dos canais de venda",
  monthlyGoal: "Meta de faturamento mensal",
  cashBalance: "Saldo em caixa informado",
  cashBalanceDate: "Data do saldo em caixa",
  totalValue: "Valor",
  purchaseDate: "Data da compra",
  category: "Categoria",
  quantity: "Quantidade",
  unitValue: "Valor unitário",
  notes: "Observações",
  tags: "Etiquetas",
  phone: "Telefone",
  email: "E-mail",
  city: "Cidade",
  title: "Título",
  body: "Mensagem",
  shortcut: "Atalho",
  steps: "Mensagens",
  sendDays: "Dias de envio",
  windowStartHour: "Início do horário de envio",
  windowEndHour: "Fim do horário de envio",
  autoEnroll: "Entrada automática",
  audience: "Público",
  repeatAfterDays: "Repetir depois de (dias)",
  kind: "Tipo",
  autoSendEnabled: "Envio automático ligado",
  dailyLimit: "Limite diário",
  awayEnabled: "Resposta fora do horário",
  awayText: "Texto fora do horário",
  greetingEnabled: "Boas-vindas ligadas",
  greetingText: "Texto de boas-vindas",
  orderNotifyEnabled: "Avisos de pedido por WhatsApp",
  orderTemplates: "Textos dos avisos de pedido",
  pausedReason: "Motivo da pausa",
  status: "Situação",
  stage: "Etapa",
  deadline: "Prazo",
  adminNotes: "Observações internas",
  text: "Texto",
  usageCount: "Vezes usado",
  number: "Número",
  alteracao: "Alteração desfeita",
  tipo: "Tipo",
  isActive: "Ativo",
};

const MONEY_FIELDS = new Set([
  "price",
  "compareAtPrice",
  "freeShippingThreshold",
  "localDeliveryThreshold",
  "localDeliveryFee",
  "monthlyGoal",
  "cashBalance",
  "totalValue",
  "unitValue",
  "minSubtotal",
  "printerCostPerHour",
  "energyCostPerHour",
  "defaultMaterialCostPerGram",
]);
const PERCENT_FIELDS = new Set(["pixDiscountPct", "defaultProfitMarginPct", "averageFailureRatePct"]);

const RULE_SPECS = new Map(RULE_FIELDS.map((spec) => [RULES_PREFIX + spec.path, spec]));

export function fieldLabel(field: string) {
  const rule = RULE_SPECS.get(field);
  if (rule) return `Regras da loja: ${rule.label}`;
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const words = field.replace(/([A-Z])/g, " $1").toLowerCase().trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function formatAuditValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "vazio";
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  if (typeof value === "number") {
    const rule = RULE_SPECS.get(field);
    if (rule?.kind === "money") return brl(value);
    if (rule?.unit) return `${String(value).replace(".", ",")} ${rule.unit}`;
    if (MONEY_FIELDS.has(field)) return brl(value);
    if (PERCENT_FIELDS.has(field)) return `${value}%`;
    return String(value).replace(".", ",");
  }
  if (typeof value === "string") {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
    }
    return value.length > 140 ? `${value.slice(0, 140)}…` : value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "vazio";
    if (value.every((v) => typeof v === "string" || typeof v === "number")) return value.join(", ");
    return `${value.length} item(ns)`;
  }
  const text = JSON.stringify(value);
  return text.length > 140 ? `${text.slice(0, 140)}…` : text;
}

/** "Desconto no Pix: 5% → 7%". */
export function describeChange(change: AuditChange) {
  return `${fieldLabel(change.field)}: ${formatAuditValue(change.field, change.from)} → ${formatAuditValue(change.field, change.to)}`;
}

export const KIND_LABELS: Record<string, string> = { create: "Criou", update: "Alterou", delete: "Excluiu", event: "Ação" };

/** Nomes das ações com nome próprio (as que não são só "criou/alterou/excluiu"). */
export const EVENT_LABELS: Record<string, string> = {
  "pedido.status": "Mudou o status do pedido",
  "pedido.excluir": "Excluiu o pedido",
  "pedido.pago": "Marcou pedido(s) como pago(s)",
  "pedido.pagamento": "Registrou ou corrigiu um pagamento",
  "pedido.producao": "Alterou a produção do pedido",
  "produto.excluir": "Excluiu o produto",
  "orcamento.criar": "Criou o orçamento",
  "orcamento.editar": "Editou o orçamento",
  "orcamento.duplicar": "Duplicou o orçamento",
  "orcamento.enviar": "Enviou o orçamento",
  "orcamento.status": "Mudou a situação do orçamento",
  "orcamento.converter": "Converteu o orçamento em pedido",
  "orcamento.excluir": "Excluiu o orçamento",
  "orcamento.acompanhar": "Registrou o acompanhamento do orçamento",
  "encomenda.manual": "Lançou uma encomenda manual",
  "venda.manual": "Lançou uma venda manual",
  "venda.producao": "Lançou um item de produção como venda",
  "campanha.criar": "Criou a campanha de e-mail",
  "campanha.enviar": "Enviou a campanha de e-mail",
  "cliente.lembrete": "Lembrou um cliente que sumiu",
  "painel.entrou": "Entrou no painel",
  "auditoria.desfazer": "Desfez uma alteração",
  "whatsapp.ajustes": "Alterou os ajustes do WhatsApp",
  "whatsapp.config": "Alterou as regras de envio do WhatsApp",
  "whatsapp.conversa": "Abriu uma conversa de WhatsApp",
  "whatsapp.importar": "Importou uma lista de contatos",
  "whatsapp.lote": "Aplicou uma ação em várias conversas",
  "whatsapp.optout": "Marcou contato como não quer receber",
  "whatsapp.optin": "Reativou um contato",
  "whatsapp.cadencia.aplicar-publico": "Colocou contatos numa cadência",
  "whatsapp.cadencia.cancelar-varios": "Cancelou várias cadências",
  "whatsapp.cadencia.enviar-agora": "Enviou agora uma mensagem de cadência",
  "whatsapp.cadencia.excluir": "Excluiu a cadência",
  "whatsapp.cadencia.criar": "Criou a cadência",
  "whatsapp.cadencia.editar": "Editou a cadência",
};

/** Título da linha na página Atividade. */
export function entryTitle(entry: { kind: string; action: string; targetType: string }) {
  if (entry.kind === "event") return EVENT_LABELS[entry.action] ?? entry.action;
  return `${KIND_LABELS[entry.kind] ?? entry.kind} ${modelLabel(entry.targetType).toLowerCase()}`;
}

/** Pode desfazer esta mudança pelo painel? */
export function canRestore(entry: { kind: string; targetType: string; restoredAt?: Date | string | null }) {
  if (entry.restoredAt) return false;
  const info = AUDITED_MODELS[entry.targetType];
  if (!info) return false;
  if (entry.kind === "update") return info.restorableUpdate;
  if (entry.kind === "delete") return info.restorableDelete;
  return false;
}
