export type ProductType = "pronta_entrega" | "sob_encomenda";

export type Category = {
  slug: string;
  name: string;
  description: string;
  icon?: string;
};

export type MaterialColor = {
  name: string;
  hex: string;
};

export type Material = {
  slug: string;
  name: string;
  colors: MaterialColor[];
};

/** One material option offered on a product, with the colors available in that material. */
export type ProductMaterialOption = {
  material: string;
  colors: string[];
};

export type Product = {
  slug: string;
  name: string;
  categorySlug: string;
  /**
   * Denormalized category name — always populated fresh by the product
   * repository at read time (never trusted from storage/input), so
   * renaming a category shows up on every product immediately without a
   * cascade-update step.
   */
  categoryName: string;
  type: ProductType;
  description: string;
  /** Null/undefined means "sob consulta" — common for sob_encomenda pieces without a fixed price. */
  price?: number;
  compareAtPrice?: number;
  materials: ProductMaterialOption[];
  scaleOptions: string[];
  weightGrams?: number;
  dimensions?: string;
  /** Only shown/used when type is "sob_encomenda". */
  estimatedProductionDays?: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  tags: string[];
  relatedSlugs?: string[];
  /** Stock level — drives the "Esgotado"/"Últimas peças" badges and purchase gating. Only meaningful for pronta_entrega. */
  stock: number;
  /** Overrides the category-derived placeholder art direction when set. */
  imageTone?: import("@/components/placeholder-photo").PlaceholderTone;
  /** Real photo URLs. Falls back to the generated placeholder when empty. */
  images?: string[];
  /** Mão de obra/custos fixos por peça — usado no cálculo de custo de produção. */
  laborCost?: number;
};

export type CartLine = {
  productSlug: string;
  material: string;
  color: string;
  quantity: number;
};

export type CustomRequestStatus = "novo" | "em_contato" | "orcamento_enviado" | "fechado" | "perdido";

export type CustomOrderRequest = {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  email?: string;
  description: string;
  referenceProductSlug?: string;
  referenceFileUrl?: string;
  materialPreference?: string;
  colorPreference?: string;
  quantity: number;
  desiredDeadline?: string;
  status: CustomRequestStatus;
  adminNotes?: string;
  linkedOrderId?: string;
};
