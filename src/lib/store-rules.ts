/**
 * Regras da loja editáveis em /admin/configuracoes/regras: números, prazos, textos padrão e dados da empresa que antes ficavam fixos
 * no código. Tudo tem um valor padrão igual ao que a loja já usava, então nada muda até alguém editar.
 * Uma regra nova entra aqui (tipo, padrão e campo) e aparece sozinha na tela; não precisa de migração do banco.
 */

export type StoreRules = {
  company: {
    legalName: string;
    cnpj: string;
    street: string;
    neighborhood: string;
    city: string;
    state: string;
    zip: string;
    instagramUrl: string;
    tagline: string;
    pixNotice: string;
  };
  shipping: { standardCost: number; standardEta: string; expressCost: number; expressEta: string };
  localDelivery: { cities: string[]; state: string; etaText: string };
  payments: { installments: number; welcomeCouponCode: string; welcomeCouponText: string };
  storefront: { lowStockThreshold: number; scarcityThreshold: number; returnDays: number };
  automation: {
    abandonedCartHours: number;
    abandonedCartSecondDays: number;
    pendingOrderExpireDays: number;
    reactivationDays: number;
    reminderCooldownDays: number;
  };
  reviews: { rewardValue: number; rewardMinSubtotal: number };
  finance: { growthMultiplier: number; growthMonths: number };
  quote: { validityDays: number; deliveryText: string; paymentText: string; notesText: string };
  owner: { email: string };
  texts: { whatsappMessage: string; customOrderIntro: string };
};

export const DEFAULT_RULES: StoreRules = {
  company: {
    legalName: "Fazaê 3D",
    cnpj: process.env.NEXT_PUBLIC_COMPANY_CNPJ ?? "",
    street: "Rua Luís Nogueira Filho, 419",
    neighborhood: "Nova Esperança",
    city: "Parnamirim",
    state: "RN",
    zip: "59144-336",
    instagramUrl: "https://instagram.com/fazae.3d",
    tagline: "Você imagina. A gente cria.",
    pixNotice:
      "No Pix, o nome do recebedor pode aparecer diferente de Fazaê. Isso acontece porque ainda somos MEI e o Pix sai no nome do nosso titular. Pode pagar tranquilo, o pagamento é nosso e é seguro.",
  },
  shipping: { standardCost: 24.9, standardEta: "5 a 8 dias úteis", expressCost: 39.9, expressEta: "2 a 3 dias úteis" },
  localDelivery: { cities: ["Natal", "Parnamirim"], state: "RN", etaText: "Entrega em até 48h" },
  payments: { installments: 3, welcomeCouponCode: "FAZAE10", welcomeCouponText: "10% OFF na primeira compra" },
  storefront: { lowStockThreshold: 5, scarcityThreshold: 2, returnDays: 7 },
  automation: { abandonedCartHours: 2, abandonedCartSecondDays: 3, pendingOrderExpireDays: 4, reactivationDays: 120, reminderCooldownDays: 30 },
  reviews: { rewardValue: 5, rewardMinSubtotal: 30 },
  finance: { growthMultiplier: 5, growthMonths: 12 },
  quote: {
    validityDays: 7,
    deliveryText: "7 a 10 dias úteis após a confirmação do pagamento.",
    paymentText: "Pix ou cartão de crédito. Para iniciar a produção pedimos 50% de sinal; o restante é pago antes do envio ou da retirada.",
    notesText:
      "Peças impressas em 3D: pequenas variações de textura e tonalidade são características do processo. Cores e modelo são confirmados com você antes de produzir.",
  },
  owner: { email: "" },
  texts: {
    whatsappMessage: "Olá! Tenho uma ideia para imprimir em 3D.",
    customOrderIntro:
      "Não achou o que precisa no catálogo? Conta pra gente o que você imagina, com material, cor, tamanho e referências, e a gente monta a peça perfeita para você.",
  },
};

export type RuleGroupKey = "empresa" | "frete" | "pagamento" | "vitrine" | "automacao" | "clientes" | "financas" | "orcamento" | "avisos" | "textos";

export const RULE_GROUPS: { key: RuleGroupKey; title: string; description: string }[] = [
  { key: "empresa", title: "Dados da empresa", description: "Aparecem no rodapé, nas páginas legais, no Google, nos e-mails e no PDF do orçamento." },
  { key: "frete", title: "Frete e entrega", description: "Valores e prazos usados quando o CEP não permite calcular o frete real, e a entrega própria na sua região." },
  { key: "pagamento", title: "Pagamento e promoções", description: "Parcelamento mostrado na loja e o cupom de boas-vindas (barra de anúncios, carrinho, newsletter e e-mails)." },
  { key: "vitrine", title: "Vitrine", description: "Quando aparecem os selos de estoque e o prazo de troca citado no site." },
  { key: "automacao", title: "Lembretes e prazos automáticos", description: "Carrinho abandonado, Pix parado, pedidos sem pagamento e clientes que sumiram." },
  { key: "clientes", title: "Avaliações e recompensa", description: "Cupom que o cliente ganha ao avaliar um pedido." },
  { key: "financas", title: "Metas de crescimento", description: "Usado na tela de Finanças para calcular a meta de crescimento." },
  { key: "orcamento", title: "Orçamento padrão", description: "Valores que já vêm preenchidos ao criar um orçamento novo (dá para mudar em cada um)." },
  { key: "textos", title: "Textos do site", description: "Mensagem que abre o WhatsApp e a introdução da página de peça sob encomenda." },
  { key: "avisos", title: "Avisos para você", description: "Para onde vão os avisos de pedido, pagamento e contato do site." },
];

export type FieldKind = "number" | "money" | "percent" | "text" | "textarea" | "list" | "email" | "url";

export type FieldSpec = {
  path: string;
  group: RuleGroupKey;
  label: string;
  hint?: string;
  kind: FieldKind;
  min?: number;
  max?: number;
  step?: number;
  /** Número inteiro (dias, horas, parcelas...). */
  integer?: boolean;
  maxLength?: number;
  /** Pode ficar vazio. */
  optional?: boolean;
  /** Unidade mostrada ao lado do campo (ex.: "dias"). */
  unit?: string;
};

export const RULE_FIELDS: FieldSpec[] = [
  { path: "company.legalName", group: "empresa", label: "Nome da empresa", kind: "text", maxLength: 80 },
  { path: "company.cnpj", group: "empresa", label: "CNPJ", hint: "Aparece no rodapé quando preenchido. Deixe vazio enquanto não tiver.", kind: "text", maxLength: 24, optional: true },
  { path: "company.street", group: "empresa", label: "Rua e número", kind: "text", maxLength: 100 },
  { path: "company.neighborhood", group: "empresa", label: "Bairro", kind: "text", maxLength: 60 },
  { path: "company.city", group: "empresa", label: "Cidade", kind: "text", maxLength: 60 },
  { path: "company.state", group: "empresa", label: "Estado (sigla)", kind: "text", maxLength: 2 },
  { path: "company.zip", group: "empresa", label: "CEP", kind: "text", maxLength: 9 },
  { path: "company.instagramUrl", group: "empresa", label: "Endereço do Instagram", hint: "Link completo, ex.: https://instagram.com/fazae.3d", kind: "url", maxLength: 200 },
  { path: "company.tagline", group: "empresa", label: "Slogan", hint: "Aparece no rodapé, no Google e nos e-mails.", kind: "text", maxLength: 120 },
  { path: "company.pixNotice", group: "empresa", label: "Aviso sobre o nome no Pix", hint: "Mostrado no pagamento. Apague quando o Pix sair no nome da empresa (deixe vazio para não mostrar).", kind: "textarea", maxLength: 500, optional: true },

  { path: "shipping.standardCost", group: "frete", label: "Frete padrão: valor", hint: "Usado quando o frete real por CEP não está disponível.", kind: "money", min: 0, max: 500 },
  { path: "shipping.standardEta", group: "frete", label: "Frete padrão: prazo", hint: "Ex.: 5 a 8 dias úteis", kind: "text", maxLength: 60 },
  { path: "shipping.expressCost", group: "frete", label: "Frete expresso: valor", kind: "money", min: 0, max: 500 },
  { path: "shipping.expressEta", group: "frete", label: "Frete expresso: prazo", kind: "text", maxLength: 60 },
  { path: "localDelivery.cities", group: "frete", label: "Cidades com entrega própria", hint: "Uma por linha. O valor mínimo e a taxa ficam na aba Loja.", kind: "list", maxLength: 60 },
  { path: "localDelivery.state", group: "frete", label: "Estado da entrega própria (sigla)", kind: "text", maxLength: 2 },
  { path: "localDelivery.etaText", group: "frete", label: "Prazo da entrega própria", hint: "Ex.: Entrega em até 48h", kind: "text", maxLength: 60 },

  { path: "payments.installments", group: "pagamento", label: "Parcelas sem juros", hint: "Aparece nos produtos e na barra de anúncios. 1 desliga a mensagem de parcelamento.", kind: "number", min: 1, max: 12, integer: true, unit: "x" },
  { path: "payments.welcomeCouponCode", group: "pagamento", label: "Cupom de boas-vindas (código)", hint: "Precisa existir em Cupons. Deixe vazio para não divulgar nenhum cupom.", kind: "text", maxLength: 30, optional: true },
  { path: "payments.welcomeCouponText", group: "pagamento", label: "Cupom de boas-vindas (o que ele dá)", hint: "Ex.: 10% OFF na primeira compra", kind: "text", maxLength: 80, optional: true },

  { path: "storefront.lowStockThreshold", group: "vitrine", label: "Estoque baixo a partir de", hint: "Peças com estoque até esse número entram em “estoque baixo” no painel.", kind: "number", min: 1, max: 100, integer: true, unit: "peças" },
  { path: "storefront.scarcityThreshold", group: "vitrine", label: "Selo “Últimas peças” até", hint: "Quanto menor, mais honesto o selo. Acima de 3 ele aparece em quase tudo.", kind: "number", min: 1, max: 20, integer: true, unit: "peças" },
  { path: "storefront.returnDays", group: "vitrine", label: "Prazo de troca e devolução", hint: "A lei garante 7 dias de arrependimento nas compras online; aumente só se for oferecer mais.", kind: "number", min: 7, max: 90, integer: true, unit: "dias" },

  { path: "automation.abandonedCartHours", group: "automacao", label: "Carrinho abandonado: 1º lembrete depois de", hint: "A verificação roda uma vez por dia.", kind: "number", min: 1, max: 72, integer: true, unit: "horas" },
  { path: "automation.abandonedCartSecondDays", group: "automacao", label: "Carrinho abandonado: 2º lembrete depois de", kind: "number", min: 1, max: 30, integer: true, unit: "dias" },
  { path: "automation.pendingOrderExpireDays", group: "automacao", label: "Pedido sem pagamento expira em", hint: "Depois disso o pedido é cancelado e o estoque volta.", kind: "number", min: 1, max: 30, integer: true, unit: "dias" },
  { path: "automation.reactivationDays", group: "automacao", label: "Cliente “sumido” depois de", hint: "Entra na lista “Para reativar” e nas regras de reativação.", kind: "number", min: 30, max: 730, integer: true, unit: "dias" },
  { path: "automation.reminderCooldownDays", group: "automacao", label: "Intervalo entre lembretes ao mesmo cliente", kind: "number", min: 1, max: 365, integer: true, unit: "dias" },

  { path: "reviews.rewardValue", group: "clientes", label: "Cupom ao avaliar: valor", hint: "Desconto em reais que o cliente ganha ao avaliar um pedido entregue.", kind: "money", min: 0, max: 200 },
  { path: "reviews.rewardMinSubtotal", group: "clientes", label: "Cupom ao avaliar: compra mínima", kind: "money", min: 0, max: 1000 },

  { path: "finance.growthMultiplier", group: "financas", label: "Crescer o faturamento mensal em", hint: "Ex.: 5 significa chegar a 5 vezes o faturamento do começo.", kind: "number", min: 1.1, max: 100, step: 0.1, unit: "vezes" },
  { path: "finance.growthMonths", group: "financas", label: "No prazo de", kind: "number", min: 1, max: 60, integer: true, unit: "meses" },

  { path: "quote.validityDays", group: "orcamento", label: "Validade", kind: "number", min: 1, max: 90, integer: true, unit: "dias" },
  { path: "quote.deliveryText", group: "orcamento", label: "Prazo de entrega", kind: "textarea", maxLength: 300 },
  { path: "quote.paymentText", group: "orcamento", label: "Forma de pagamento", kind: "textarea", maxLength: 500 },
  { path: "quote.notesText", group: "orcamento", label: "Observações", kind: "textarea", maxLength: 800, optional: true },

  { path: "owner.email", group: "avisos", label: "E-mail para receber avisos", hint: "Recebe novo pedido, pagamento aprovado e mensagens do formulário de contato. Vazio usa o e-mail configurado no servidor.", kind: "email", maxLength: 120, optional: true },
  { path: "texts.whatsappMessage", group: "textos", label: "Mensagem pronta do WhatsApp", hint: "Texto que já vem escrito quando o cliente clica em “Fazer orçamento no WhatsApp”.", kind: "textarea", maxLength: 300 },
  { path: "texts.customOrderIntro", group: "textos", label: "Introdução da página Sob encomenda", hint: "Frase logo abaixo do título da página /personalizado.", kind: "textarea", maxLength: 400 },
];

/* ---------- leitura e escrita por caminho ("shipping.standardCost") ---------- */

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

export function setPath(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let cursor = obj;
  for (const key of keys.slice(0, -1)) {
    if (!cursor[key] || typeof cursor[key] !== "object") cursor[key] = {};
    cursor = cursor[key] as Record<string, unknown>;
  }
  cursor[keys[keys.length - 1]] = value;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Valida um valor contra o campo. Devolve o valor limpo ou a mensagem de erro (em português, citando o campo). */
export function validateField(spec: FieldSpec, raw: unknown): { ok: true; value: unknown } | { ok: false; error: string } {
  const name = spec.label;
  if (spec.kind === "list") {
    const items = (Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(/\r?\n/) : [])
      .map((v) => String(v).trim())
      .filter(Boolean);
    const unique = [...new Set(items)];
    if (unique.length > 30) return { ok: false, error: `${name}: no máximo 30 itens.` };
    if (unique.some((v) => v.length > (spec.maxLength ?? 80))) return { ok: false, error: `${name}: algum item é longo demais.` };
    return { ok: true, value: unique };
  }
  if (spec.kind === "number" || spec.kind === "money" || spec.kind === "percent") {
    const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(",", "."));
    if (!Number.isFinite(n)) return { ok: false, error: `${name}: informe um número válido.` };
    if (spec.integer && !Number.isInteger(n)) return { ok: false, error: `${name}: use um número inteiro.` };
    if (spec.min !== undefined && n < spec.min) return { ok: false, error: `${name}: o mínimo é ${spec.min}.` };
    if (spec.max !== undefined && n > spec.max) return { ok: false, error: `${name}: o máximo é ${spec.max}.` };
    return { ok: true, value: spec.kind === "money" ? Math.round(n * 100) / 100 : n };
  }
  const text = typeof raw === "string" ? raw.trim() : raw === null || raw === undefined ? "" : String(raw).trim();
  if (!text) return spec.optional ? { ok: true, value: "" } : { ok: false, error: `${name}: preencha este campo.` };
  if (spec.maxLength && text.length > spec.maxLength) return { ok: false, error: `${name}: passa de ${spec.maxLength} caracteres.` };
  if (spec.kind === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) return { ok: false, error: `${name}: e-mail inválido.` };
  if (spec.kind === "url" && !/^https?:\/\/\S+$/i.test(text)) return { ok: false, error: `${name}: use um link que comece com https://` };
  if (spec.path === "company.state" || spec.path === "localDelivery.state") {
    if (!/^[A-Za-z]{2}$/.test(text)) return { ok: false, error: `${name}: use a sigla com 2 letras (ex.: RN).` };
    return { ok: true, value: text.toUpperCase() };
  }
  if (spec.path === "company.zip" && !/^\d{5}-?\d{3}$/.test(text)) return { ok: false, error: `${name}: use o formato 00000-000.` };
  return { ok: true, value: text };
}

/** Lê o que está salvo no banco e completa com os padrões; valor inválido ou ausente volta ao padrão (nunca quebra a loja). */
export function parseStoreRules(raw: unknown): StoreRules {
  const rules = clone(DEFAULT_RULES);
  if (!raw || typeof raw !== "object") return rules;
  for (const spec of RULE_FIELDS) {
    const stored = getPath(raw, spec.path);
    if (stored === undefined) continue;
    const checked = validateField(spec, stored);
    if (checked.ok && !(typeof checked.value === "string" && checked.value === "" && !spec.optional)) setPath(rules as unknown as Record<string, unknown>, spec.path, checked.value);
  }
  return rules;
}

/** Valida tudo o que veio do formulário. */
export function validateRulesInput(input: unknown): { ok: true; rules: StoreRules } | { ok: false; error: string } {
  const rules = clone(DEFAULT_RULES);
  for (const spec of RULE_FIELDS) {
    const checked = validateField(spec, getPath(input, spec.path));
    if (!checked.ok) return checked;
    setPath(rules as unknown as Record<string, unknown>, spec.path, checked.value);
  }
  if (rules.shipping.expressCost < rules.shipping.standardCost) {
    return { ok: false, error: "O frete expresso não pode custar menos que o padrão." };
  }
  if (rules.storefront.scarcityThreshold > rules.storefront.lowStockThreshold) {
    return { ok: false, error: "O selo “Últimas peças” não pode passar do limite de estoque baixo." };
  }
  return { ok: true, rules };
}

/** O que a vitrine (navegador) pode saber: tudo, menos o e-mail do dono. */
export type PublicRules = Omit<StoreRules, "owner">;
export function publicRules(rules: StoreRules): PublicRules {
  const { owner: _owner, ...rest } = rules;
  void _owner;
  return rest;
}

/* ---------- derivados usados em vários lugares ---------- */

/** "Rua X, 419, Nova Esperança, Parnamirim/RN". */
export function companyAddress(company: StoreRules["company"]) {
  return `${company.street}, ${company.neighborhood}, ${company.city}/${company.state}`;
}

/** "Fazaê 3D · CNPJ ... · Rua ... · CEP ..." (sem o CNPJ enquanto não houver). */
export function companyIdentificationLine(company: StoreRules["company"]) {
  return [company.legalName, company.cnpj ? `CNPJ ${company.cnpj}` : null, companyAddress(company), `CEP ${company.zip}`].filter(Boolean).join(" · ");
}

/** "Natal e Parnamirim" / "Natal, Parnamirim e Macaíba". */
export function joinNames(names: string[]) {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} e ${names[names.length - 1]}`;
}

export function localDeliveryLabels(rules: Pick<StoreRules, "localDelivery">) {
  const cities = joinNames(rules.localDelivery.cities);
  return { citiesLabel: cities, label: `Entrega em ${cities}`, eta: rules.localDelivery.etaText };
}
