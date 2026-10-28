import { z } from "zod";
import { isValidDocument } from "@/lib/cpf";

export const materialColorSchema = z.object({
  name: z.string().min(1, "Informe o nome da cor."),
  hex: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Use um código hex válido (#000000)."),
});

export const productMaterialOptionSchema = z.object({
  material: z.string().min(1, "Selecione um material."),
  colors: z.array(z.string().min(1)).min(1, "Selecione ao menos uma cor para este material."),
});

export const productFormSchema = z.object({
  slug: z
    .string()
    .min(2, "Informe o slug.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens."),
  name: z.string().min(2, "Informe o nome."),
  categorySlug: z.string().min(1, "Selecione uma categoria."),
  type: z.enum(["pronta_entrega", "sob_encomenda"]),
  // Plain z.number() (no z.coerce) so the schema's input and output types
  // match, react-hook-form's `valueAsNumber` on the inputs does the
  // string→number conversion instead. Mixing z.coerce with useForm's
  // single-generic typing makes the resolver's input/output types diverge
  // and breaks inference for every other field in the form, not just this one.
  price: z.union([z.number().positive(), z.literal("")]).optional(),
  compareAtPrice: z.union([z.number().positive(), z.literal("")]).optional(),
  stock: z.number("Use um número inteiro.").int("Use um número inteiro.").min(0, "Estoque não pode ser negativo."),
  materials: z.array(productMaterialOptionSchema).min(1, "Adicione ao menos um material."),
  scaleOptions: z.array(z.string().min(1)).optional(),
  weightGrams: z.union([z.number().int().positive(), z.literal("")]).optional(),
  dimensions: z.string().optional(),
  packageWidthCm: z.union([z.number().positive(), z.literal("")]).optional(),
  packageHeightCm: z.union([z.number().positive(), z.literal("")]).optional(),
  packageLengthCm: z.union([z.number().positive(), z.literal("")]).optional(),
  estimatedProductionDays: z.union([z.number().int().positive(), z.literal("")]).optional(),
  description: z.string().min(10, "Escreva uma descrição com pelo menos 10 caracteres."),
  tagsRaw: z.string().optional(),
  isNew: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
  hidden: z.boolean().optional(),
  imageTone: z.enum(["fitness", "surf", "street", "lifestyle", "ink", "sand"]).optional(),
  images: z.array(z.string()).optional(),
  laborCost: z.union([z.number().min(0), z.literal("")]).optional(),
  materialUsages: z
    .array(
      z.object({
        rawMaterialId: z.string().min(1, "Selecione um insumo."),
        quantity: z.number("Informe uma quantidade válida.").positive("A quantidade deve ser maior que zero."),
      }),
    )
    .optional(),
});

export type ProductFormInput = z.infer<typeof productFormSchema>;

export const categoryFormSchema = z.object({
  slug: z
    .string()
    .min(2, "Informe o slug.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens."),
  name: z.string().min(2, "Informe o nome."),
  description: z.string().min(10, "Escreva uma descrição com pelo menos 10 caracteres."),
  icon: z.string().optional(),
});

export type CategoryFormInput = z.infer<typeof categoryFormSchema>;

export const materialFormSchema = z.object({
  slug: z
    .string()
    .min(2, "Informe o slug.")
    .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use apenas letras minúsculas, números e hífens."),
  name: z.string().min(2, "Informe o nome."),
  colors: z.array(materialColorSchema).min(1, "Adicione ao menos uma cor."),
});

export type MaterialFormInput = z.infer<typeof materialFormSchema>;

export const rawMaterialFormSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  unit: z.string().min(1, "Selecione a unidade."),
  stock: z.number("Informe um estoque válido.").min(0, "Estoque não pode ser negativo."),
  costPerUnit: z.number("Informe um custo válido.").min(0, "O custo não pode ser negativo."),
  minStock: z.union([z.number().min(0), z.literal("")]).optional(),
});

export type RawMaterialFormInput = z.infer<typeof rawMaterialFormSchema>;

export const customOrderRequestUpdateSchema = z.object({
  status: z.enum(["novo", "em_contato", "orcamento_enviado", "fechado", "perdido"]),
  adminNotes: z.string().optional(),
});

export type CustomOrderRequestUpdateInput = z.infer<typeof customOrderRequestUpdateSchema>;

export const couponFormSchema = z
  .object({
    code: z
      .string()
      .min(3, "Informe um código com pelo menos 3 caracteres.")
      .regex(/^[A-Za-z0-9]+$/, "Use apenas letras e números, sem espaços.")
      .transform((v) => v.toUpperCase()),
    type: z.enum(["percentual", "fixo", "frete-gratis"]),
    value: z.number("Informe um valor válido.").min(0, "O valor não pode ser negativo."),
    minSubtotal: z.union([z.number().min(0), z.literal("")]).optional(),
    usageLimit: z.union([z.number().int().min(1), z.literal("")]).optional(),
    active: z.boolean(),
  })
  .refine((data) => data.type !== "percentual" || data.value <= 100, {
    message: "Cupom percentual não pode passar de 100%.",
    path: ["value"],
  });

export type CouponFormInput = z.infer<typeof couponFormSchema>;

export const manualSaleItemSchema = z
  .object({
    /** Produto do catálogo. Vazio = produto manual (peça personalizada que não está na loja), identificado por `customName`. */
    productSlug: z.string().optional(),
    customName: z.string().trim().optional(),
    material: z.string().optional(),
    color: z.string().optional(),
    quantity: z.number("Informe uma quantidade válida.").int().min(1, "Quantidade mínima é 1."),
    price: z.number("Informe um preço válido.").min(0, "O preço não pode ser negativo."),
  })
  .superRefine((item, ctx) => {
    if (!item.productSlug && !item.customName) {
      ctx.addIssue({ code: "custom", message: "Selecione um produto ou digite o nome do produto manual." });
    }
    if (item.productSlug && (!item.material || !item.color)) {
      ctx.addIssue({ code: "custom", message: "Selecione o material e a cor do produto." });
    }
  });

export const manualSaleFormSchema = z.object({
  channel: z.enum(["presencial", "whatsapp", "mercado_livre", "shopee", "tiktok_shop"]),
  /** Só para marketplaces: taxa cobrada pelo canal nesta venda (R$). Vazio = calcula pelas taxas das Configurações. */
  channelFee: z.number("Informe uma taxa válida.").min(0, "A taxa não pode ser negativa.").optional(),
  customerName: z.string().min(1, "Informe o nome do cliente."),
  customerPhone: z.string().optional(),
  /** Como o cliente conheceu a loja (lib/customer-source); só vale para cliente novo. */
  customerSource: z.string().optional(),
  /** Venda presencial ou de WhatsApp sem telefone: precisa ser marcado de propósito. */
  customerPhoneSkipped: z.boolean().optional(),
  paymentMethod: z.enum(["pix", "cartao", "boleto"]),
  status: z.enum([
    "Pedido recebido",
    "Pagamento aprovado",
    "Em preparação",
    "Enviado",
    "Em trânsito",
    "Entregue",
    "Cancelado",
  ]),
  productionPending: z.boolean().optional(),
  /** Frete cobrado do cliente (R$). Vazio ou 0 = sem frete. */
  shipping: z.number("Informe um frete válido.").min(0, "O frete não pode ser negativo.").optional(),
  items: z.array(manualSaleItemSchema).min(1, "Adicione ao menos um produto."),
});

export type ManualSaleFormInput = z.infer<typeof manualSaleFormSchema>;

/** "Lançar como venda" a partir de um item de produção, mesmos dados do lançar venda manual, mas a linha vem do item. */
export const productionItemSaleSchema = manualSaleFormSchema
  .pick({ channel: true, customerName: true, customerPhone: true, paymentMethod: true, status: true })
  .extend({
    quantity: z.number("Informe uma quantidade válida.").int().min(1, "Quantidade mínima é 1."),
    unitPrice: z.number("Informe um preço válido.").min(0, "O preço não pode ser negativo."),
    material: z.string().optional(),
    color: z.string().optional(),
  });

export type ProductionItemSaleInput = z.infer<typeof productionItemSaleSchema>;

export const customerCrmSchema = z.object({
  notes: z.string().optional(),
  tagsRaw: z.string().optional(),
});

export type CustomerCrmInput = z.infer<typeof customerCrmSchema>;

export const customerCreateSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  phone: z.string().min(8, "Informe um telefone válido."),
  email: z.union([z.string().email("E-mail inválido."), z.literal("")]).optional(),
  notes: z.string().optional(),
  tagsRaw: z.string().optional(),
});

export type CustomerCreateInput = z.infer<typeof customerCreateSchema>;

export const consigneeFormSchema = z.object({
  name: z.string().min(2, "Informe o nome."),
  document: z.string().refine(isValidDocument, "CPF ou CNPJ inválido."),
  phone: z.string().min(8, "Informe um telefone válido."),
  email: z.union([z.string().email("E-mail inválido."), z.literal("")]).optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  notes: z.string().optional(),
});

export type ConsigneeFormInput = z.infer<typeof consigneeFormSchema>;

export const deliverConsignmentItemSchema = z.object({
  productSlug: z.string().min(1, "Selecione um produto."),
  consignedPrice: z.number("Informe um preço válido.").positive("O preço deve ser maior que zero."),
  quantity: z.number("Informe uma quantidade válida.").int().positive("A quantidade deve ser maior que zero."),
});

export type DeliverConsignmentItemInput = z.infer<typeof deliverConsignmentItemSchema>;

export const registerConsignmentSaleReturnSchema = z
  .object({
    productSlug: z.string().min(1),
    quantitySold: z.number().int().min(0).optional(),
    quantityReturned: z.number().int().min(0).optional(),
  })
  .refine((data) => (data.quantitySold ?? 0) + (data.quantityReturned ?? 0) > 0, {
    message: "Informe ao menos uma quantidade vendida ou devolvida.",
    path: ["quantitySold"],
  });

export type RegisterConsignmentSaleReturnInput = z.infer<typeof registerConsignmentSaleReturnSchema>;

export const registerConsignmentVisitSchema = z.object({
  visitDate: z.string().min(1, "Informe a data da visita."),
  nextVisitDate: z.string().optional(),
  amountCollected: z.number("Informe um valor válido.").min(0, "O valor não pode ser negativo.").optional(),
  notes: z.string().optional(),
});

export type RegisterConsignmentVisitInput = z.infer<typeof registerConsignmentVisitSchema>;

export const quoteItemSchema = z.object({
  description: z.string().trim().min(1, "Descreva cada item do orçamento."),
  details: z.string().optional(),
  quantity: z.number("Informe uma quantidade válida.").int("Informe uma quantidade válida.").min(1, "Quantidade mínima é 1."),
  unitPrice: z.number("Informe um valor válido.").min(0, "O valor não pode ser negativo."),
  productSlug: z.string().optional(),
});

export const quoteFormSchema = z.object({
  customerName: z.string().trim().min(2, "Informe o nome do cliente."),
  customerPhone: z.string().optional(),
  customerEmail: z.union([z.string().email("E-mail inválido."), z.literal("")]).optional(),
  customerDocument: z.string().optional(),
  customerAddress: z.string().optional(),
  title: z.string().optional(),
  items: z.array(quoteItemSchema).min(1, "Adicione ao menos um item."),
  discount: z.number("Informe um desconto válido.").min(0, "O desconto não pode ser negativo."),
  shipping: z.number("Informe um frete válido.").min(0, "O frete não pode ser negativo."),
  freeShipping: z.boolean().optional(),
  /** Valor normal do frete quando é grátis (aparece riscado no orçamento). */
  shippingOriginal: z.number("Informe um valor válido.").min(0, "O valor não pode ser negativo.").optional(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe até quando o orçamento vale."),
  deliveryTime: z.string().optional(),
  paymentTerms: z.string().optional(),
  notes: z.string().optional(),
  /** Quanto do total o QR do Pix cobra (0 a 100). */
  pixDepositPct: z.number().int().min(0, "A porcentagem do Pix vai de 0 a 100.").max(100, "A porcentagem do Pix vai de 0 a 100.").optional(),
  /** Como o cliente vai pagar. */
  paymentMethod: z.enum(["pix", "cartao"]).optional(),
  /** No cartão: acréscimo em R$ (vazio = isento) e parcelas. */
  cardSurcharge: z.number("Informe um acréscimo válido.").min(0, "O acréscimo não pode ser negativo.").max(1_000_000, "Acréscimo alto demais.").optional(),
  cardInstallments: z.number().int("Use um número inteiro de parcelas.").min(1, "Use pelo menos 1 parcela.").max(24, "No máximo 24 parcelas.").optional(),
  linkedRequestId: z.string().optional(),
});

export type QuoteFormInput = z.infer<typeof quoteFormSchema>;
