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
    // Miniatura inteira (sem cortar) com a própria foto desfocada ao fundo para não sobrar faixa vazia.
    return (
      <div className={`relative overflow-hidden bg-mist ${className}`}>
        <img src={image} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-md" />
        <img src={image} alt={product.name} className="relative h-full w-full object-contain" />
      </div>
    );
  }
  return <div className={`bg-mist ${className}`} />;
}
