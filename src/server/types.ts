import type { Product } from "@/lib/types";

/** What's actually held in the store — categoryName is never persisted, only joined in at read time (see product-repository.ts). */
export type StoredProduct = Omit<Product, "categoryName">;

export type Address = {
  id: string;
  label: string;
  recipient: string;
  cpf: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zip: string;
};

export type UserRole = "customer" | "admin";

export type DemoUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  addresses: Address[];
  resetToken?: string;
  resetTokenExpiresAt?: string;
};

export type OrderStatus =
  | "Pedido recebido"
  | "Pagamento aprovado"
  | "Em preparação"
  | "Enviado"
  | "Em trânsito"
  | "Entregue"
  | "Cancelado";

export type PaymentMethod = "pix" | "cartao" | "boleto";

/** Raw Mercado Pago payment status — "pending"/"in_process" until a webhook (Pix/boleto) or the initial response (cartão) confirms it. */
export type PaymentStatus = "pending" | "approved" | "in_process" | "rejected" | "cancelled";

export type SaleChannel = "online" | "presencial" | "whatsapp";

export type ProductionStage = "nao_aplicavel" | "inicio" | "em_producao" | "finalizado";

export type OrderItem = {
  productSlug: string;
  name: string;
  categoryName: string;
  material: string;
  color: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;
  createdAt: string;
  channel: SaleChannel;
  /** Set when this order originated from a CustomOrderRequest closed manually by the admin. */
  originRequestId?: string;
  /** Present for online orders (checkout requires it); absent for manual sales, which use customerName/customerPhone instead. */
  userEmail?: string;
  customerName?: string;
  customerPhone?: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  discount: number;
  couponCode?: string;
  total: number;
  paymentMethod: PaymentMethod;
  /** Raw gateway status, distinct from `status` (the order's own fulfillment status). Defaults to "pending". */
  paymentStatus?: PaymentStatus;
  /** Mercado Pago payment id — set for online orders, used to reconcile the webhook with this order. */
  mpPaymentId?: string;
  /** Only online orders (delivered) have a shipping address; manual sales don't. */
  address?: Address;
  status: OrderStatus;
  tracking?: string;
  /** Defaults to "nao_aplicavel" — always set explicitly by addOrder(), never trusted from the caller. */
  productionStage?: ProductionStage;
  productionDeadline?: string;
  /** Sinal já recebido — saldo a receber é calculado (total - depositAmount), não armazenado. Defaults to 0. */
  depositAmount?: number;
};

export type CouponType = "percentual" | "fixo" | "frete-gratis";

export type Coupon = {
  code: string;
  type: CouponType;
  value: number;
  minSubtotal?: number;
  usageLimit?: number;
  usageCount: number;
  active: boolean;
};

export type StoreSettings = {
  freeShippingThreshold: number;
  whatsappNumber: string;
  whatsappMessageTemplate?: string;
  customOrderIntroText?: string;
  /** CEP de onde a loja envia — usado como origem na cotação de frete real (Melhor Envio). */
  originCep?: string;
  /** Pré-preenchem a calculadora de precificação — nunca gravados automaticamente no produto. */
  defaultProfitMarginPct?: number;
  averageFailureRatePct?: number;
  printerCostPerHour?: number;
  energyCostPerHour?: number;
  defaultMaterialCostPerGram?: number;
};

/** Custo extra nomeado e reutilizável (argola, ímã, embalagem...) — somado ad-hoc na calculadora de precificação. */
export type AdditionalCost = {
  id: string;
  name: string;
  value: number;
};

/**
 * "equipamento" é investimento (capex) — entra no payback, não no DRE operacional.
 * "material" cobre insumos/matéria-prima; "embalagem" e "operacional" são despesa recorrente.
 */
export type ExpenseCategory = "equipamento" | "material" | "embalagem" | "operacional";

/** Registro de compra/gasto real — base do módulo Finanças. */
export type Expense = {
  id: string;
  description: string;
  category: ExpenseCategory;
  quantity?: number;
  unitValue?: number;
  totalValue: number;
  purchaseDate: string;
  notes?: string;
  createdAt: string;
};

/** "Insumo" — raw material/supply consumed to produce pieces. */
export type RawMaterial = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  costPerUnit: number;
  minStock?: number;
  createdAt: string;
};

/** "BOM": how much of a raw material one unit of a product consumes. */
export type ProductMaterialUsage = {
  id: string;
  productSlug: string;
  rawMaterialId: string;
  quantity: number;
};

export type ProductMaterialUsageWithMaterial = ProductMaterialUsage & {
  rawMaterialName: string;
  rawMaterialUnit: string;
  rawMaterialCostPerUnit: number;
};

/** CRM record, independent of login (User) — covers WhatsApp/presencial customers too. */
export type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  tags: string[];
  createdAt: string;
};

/** Customer plus aggregates computed in one pass over Order — avoids N+1 queries on the list page. */
export type CustomerWithStats = Customer & { orderCount: number; totalSpent: number };

/** Product review — only created by someone with a delivered order containing that product. */
export type Review = {
  id: string;
  productSlug: string;
  orderId: string;
  authorName: string;
  rating: number;
  text?: string;
  hidden: boolean;
  createdAt: string;
};

export type ReviewStats = { average: number; count: number };

/** Lojista/revendedor que recebe peças em consignação. */
export type Consignee = {
  id: string;
  name: string;
  document: string;
  phone: string;
  email?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
  notes?: string;
  active: boolean;
  createdAt: string;
};

/** Consignee plus aggregates over its ConsignmentItem rows — avoids N+1 queries on the list page. */
export type ConsigneeWithSummary = Consignee & {
  totalItems: number;
  totalValueOpen: number;
  nextVisitDate?: string;
};

/** Saldo atual de um produto com um lojista — quantidade e preço combinados, atualizados a cada entrega/venda/devolução. */
export type ConsignmentItem = {
  id: string;
  consigneeId: string;
  productSlug: string;
  consignedPrice: number;
  quantity: number;
  createdAt: string;
  updatedAt: string;
};

export type ConsignmentItemWithProduct = ConsignmentItem & { productName: string };

/** Registro de visita ao lojista — histórico de acerto e agenda. */
export type ConsignmentVisit = {
  id: string;
  consigneeId: string;
  visitDate: string;
  nextVisitDate?: string;
  amountCollected: number;
  notes?: string;
  createdAt: string;
};

export type ConsigneeDetail = {
  consignee: Consignee;
  items: ConsignmentItemWithProduct[];
  visits: ConsignmentVisit[];
};
