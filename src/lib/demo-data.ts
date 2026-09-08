/**
 * Server-only re-export shim. Products and categories now live in the
 * server-authoritative store (src/server/repositories) so admin CRUD is
 * consistent everywhere — this file exists so the many Server
 * Components/Actions that already import "@/lib/demo-data" keep working
 * unchanged. It must NEVER be imported from a "use client" file: a client
 * bundle would get its own disconnected, build-time-frozen copy of
 * whatever these functions returned at compile time, not live server
 * state. Client components that need product/category data use the
 * catalog-snapshot server action instead (see src/app/actions/catalog.ts).
 */
export {
  getAllCategories,
  getCategory,
} from "@/server/repositories/category-repository";
export {
  getAllProducts,
  getProduct,
  getProductsByCategory,
  getRelatedProducts,
  searchProducts,
} from "@/server/repositories/product-repository";
