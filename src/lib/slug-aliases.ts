/**
 * Endereços antigos de produtos que foram renomeados (marca registrada no endereço, nome errado...). Servem para:
 *  1) redirecionar o link antigo (301) para o novo, sem perder o que o Google já conhece;
 *  2) achar o produto mesmo assim em carrinhos, pedidos antigos e links salvos.
 */
export const SLUG_ALIASES: Record<string, string> = {
  "nike-airjordan2": "chaveiro-mini-tenis-cano-baixo",
  "nike-airjordan": "chaveiro-mini-tenis-cano-alto",
  "tenis-olympikus": "chaveiro-mini-tenis-de-corrida",
  estrelasensorial: "chaveiro-estrela-sensorial-com-alca",
};
