import type { Category, CustomOrderRequest, Material, Product } from "@/lib/types";
import type {
  Coupon,
  Customer,
  CustomerWithStats,
  DemoUser,
  Order,
  ProductMaterialUsageWithMaterial,
  RawMaterial,
} from "./types";
import {
  seedCategories,
  seedCoupons,
  seedCustomers,
  seedMaterials,
  seedProductMaterialUsages,
  seedProducts,
  seedRawMaterials,
  seedUsers,
} from "./seed-data";

/**
 * TODO(fase DB): remove este arquivo quando a Fazaê tiver o próprio banco —
 * hoje a leitura real falharia em toda página do admin sem Supabase configurado.
 */
export const fallbackCategories: Category[] = seedCategories();

export const fallbackMaterials: Material[] = seedMaterials();

export const fallbackCoupons: Coupon[] = seedCoupons();

export const fallbackUsers: DemoUser[] = seedUsers();

const categoryNameBySlug = new Map(fallbackCategories.map((c) => [c.slug, c.name]));

export const fallbackProducts: Product[] = seedProducts().map((product) => ({
  ...product,
  categoryName: categoryNameBySlug.get(product.categorySlug) ?? "",
}));

export const fallbackOrders: Order[] = [];

export const fallbackCustomOrderRequests: CustomOrderRequest[] = [];

export const fallbackRawMaterials: RawMaterial[] = seedRawMaterials();

const rawMaterialById = new Map(fallbackRawMaterials.map((rm) => [rm.id, rm]));

export const fallbackProductMaterialUsages: ProductMaterialUsageWithMaterial[] = seedProductMaterialUsages()
  .map((usage) => {
    const rawMaterial = rawMaterialById.get(usage.rawMaterialId);
    if (!rawMaterial) return null;
    return {
      ...usage,
      rawMaterialName: rawMaterial.name,
      rawMaterialUnit: rawMaterial.unit,
      rawMaterialCostPerUnit: rawMaterial.costPerUnit,
    };
  })
  .filter((usage): usage is ProductMaterialUsageWithMaterial => usage !== null);

export const fallbackCustomers: Customer[] = seedCustomers();

// fallbackOrders is always [] today, so stats are always zero — kept as a
// real map (not a hardcoded 0) so this stays correct once orders are seeded.
export const fallbackCustomersWithStats: CustomerWithStats[] = fallbackCustomers.map((customer) => {
  const customerOrders = fallbackOrders.filter((o) => o.customerPhone === customer.phone);
  return {
    ...customer,
    orderCount: customerOrders.length,
    totalSpent: customerOrders.reduce((sum, o) => sum + o.total, 0),
  };
});
