import Image from "next/image";

/**
 * Foto de produto otimizada: o Next converte para AVIF/WebP no tamanho da tela (antes iam PNGs de ~230 KB crus).
 * O elemento pai precisa ser `position: relative` e ter tamanho (a imagem preenche o pai).
 */
export function ProductPhoto({
  src,
  alt,
  sizes,
  priority = false,
  className = "object-cover",
}: {
  src: string;
  alt: string;
  /** Largura aproximada da foto em cada tela (ex.: "(min-width:1024px) 25vw, 50vw"): evita baixar imagem maior que o necessário. */
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={className} unoptimized={src.startsWith("data:")} />;
}
