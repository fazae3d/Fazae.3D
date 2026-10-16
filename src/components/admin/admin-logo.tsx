import Image from "next/image";

/**
 * Logo da Fazaê: a versão normal tem as letras brancas (para o fundo escuro); no modo claro entra a versão
 * com as letras escuras, sem fundo. Quem aparece é decidido por CSS (ver globals.css), sem esperar o JavaScript.
 */
export function AdminLogo({ className = "w-[7.5rem]", priority = false }: { className?: string; priority?: boolean }) {
  return (
    <>
      <Image src="/logo-header.webp" alt="Fazaê" width={640} height={194} priority={priority} className={`admin-logo-dark h-auto ${className}`} />
      <Image src="/logo-header-light.webp" alt="Fazaê" width={640} height={194} priority={priority} className={`admin-logo-light h-auto ${className}`} />
    </>
  );
}
