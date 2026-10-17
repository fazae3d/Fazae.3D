import type { Product } from "@/lib/types";
import { ProductPhoto } from "./product-photo";

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
    return (
      <div className={`relative overflow-hidden bg-mist ${className}`}>
        <ProductPhoto src={image} alt={product.name} sizes="120px" />
      </div>
    );
  }
  return <div className={`bg-mist ${className}`} />;
}
