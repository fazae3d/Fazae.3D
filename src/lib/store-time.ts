/**
 * A loja é de Natal/RN (America/Fortaleza, UTC-3, sem horário de verão), mas o servidor roda em UTC.
 * Sem isso, uma venda feita às 21h de 30/set aparecia em 1º/out nos relatórios.
 */
const STORE_UTC_OFFSET_MS = -3 * 60 * 60 * 1000;

/** Data deslocada para o fuso da loja: use SOMENTE os getters getUTC* dela. */
export function toStoreTime(date: Date) {
  return new Date(date.getTime() + STORE_UTC_OFFSET_MS);
}

/** Número do dia (dias desde 1970) no fuso da loja: dois horários do mesmo dia local têm o mesmo número. */
export function storeDayNumber(date: Date) {
  return Math.floor(toStoreTime(date).getTime() / 86_400_000);
}

/** "2026-09-30" do dia local da loja. */
export function storeDayKey(date: Date) {
  return toStoreTime(date).toISOString().slice(0, 10);
}

/** "2026-09" do mês local da loja (para pedidos, que têm horário). */
export function storeMonthKey(date: Date) {
  return storeDayKey(date).slice(0, 7);
}
