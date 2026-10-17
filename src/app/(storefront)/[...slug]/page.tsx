import { notFound } from "next/navigation";

/**
 * Qualquer endereço que não exista cai aqui e vira 404 DENTRO da vitrine, com cabeçalho, rodapé e a página de erro da loja
 * (o not-found da raiz não tem o layout da loja). O status HTTP continua sendo 404.
 */
export default function CatchAllNotFound() {
  notFound();
}
