/**
 * Avisos ao cliente por etapa da produção (Início, Em produção, Finalizado). Cada etapa tem: o evento do aviso (chave do modelo de
 * mensagem em Conversas, Ajustes, e do "um aviso por pedido"), o texto do botão e a regra que liga o envio automático.
 */
export type NoticeEvent = "inicio" | "producao" | "pronto";

export type StageNotice = {
  stage: "inicio" | "em_producao" | "finalizado";
  event: NoticeEvent;
  /** Nome da etapa para a pessoa que escreve a mensagem. */
  label: string;
  /** Texto do botão na tela Produção. */
  button: string;
  /** Regra (Regras da loja, Automação) que liga o envio sozinho. */
  autoRule: "queueNoticeAuto" | "productionNoticeAuto" | "readyNoticeAuto";
};

export const STAGE_NOTICES: StageNotice[] = [
  { stage: "inicio", event: "inicio", label: "Pedido na fila de produção (Início)", button: "Avisar: pedido na fila", autoRule: "queueNoticeAuto" },
  { stage: "em_producao", event: "producao", label: "Produção iniciada (Em produção)", button: "Avisar: produção iniciada", autoRule: "productionNoticeAuto" },
  { stage: "finalizado", event: "pronto", label: "Pedido pronto (Finalizado)", button: "Avisar: pedido pronto", autoRule: "readyNoticeAuto" },
];

export function stageNoticeFor(stage: string | undefined | null): StageNotice | undefined {
  return STAGE_NOTICES.find((n) => n.stage === stage);
}

export function isNoticeEvent(value: string): value is NoticeEvent {
  return STAGE_NOTICES.some((n) => n.event === value);
}
