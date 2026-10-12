import type { Product } from "@/lib/types";

/** Small cart/checkout thumbnail — real photo when available, a neutral placeholder otherwise. */
export function ProductThumb({
  product,
  className = "",
}: {
  product: Product;
  color?: string;
  className?: string;
}) {
  const image = product.images?.[0];
  if (image) {
    // A foto preenche toda a miniatura, sem sobras.
    return <img src={image} alt={product.name} className={`bg-mist object-cover ${className}`} />;
  }
  return <div className={`bg-mist ${className}`} />;
}
