import { z } from "zod";

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
  // match — react-hook-form's `valueAsNumber` on the inputs does the
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
  estimatedProductionDays: z.union([z.number().int().positive(), z.literal("")]).optional(),
  description: z.string().min(10, "Escreva uma descrição com pelo menos 10 caracteres."),
  tagsRaw: z.string().optional(),
  isNew: z.boolean().optional(),
  isBestSeller: z.boolean().optional(),
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

export const manualSaleItemSchema = z.object({
  productSlug: z.string().min(1, "Selecione um produto."),
  material: z.string().min(1, "Selecione o material."),
  color: z.string().min(1, "Selecione a cor."),
  quantity: z.number("Informe uma quantidade válida.").int().min(1, "Quantidade mínima é 1."),
  price: z.number("Informe um preço válido.").min(0, "O preço não pode ser negativo."),
});

export const manualSaleFormSchema = z.object({
  channel: z.enum(["presencial", "whatsapp"]),
  customerName: z.string().min(1, "Informe o nome do cliente."),
  customerPhone: z.string().optional(),
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
  items: z.array(manualSaleItemSchema).min(1, "Adicione ao menos um produto."),
});

export type ManualSaleFormInput = z.infer<typeof manualSaleFormSchema>;

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
