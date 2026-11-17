import { storeDayNumber } from "@/lib/store-time";

const DAY_MS = 86_400_000;

/** Segunda a sexta (feriados não entram na conta). `dayNumber` = dias desde 1970. */
function isBusinessDay(dayNumber: number) {
  const weekday = new Date(dayNumber * DAY_MS).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

/**
 * Data final (meia-noite UTC, o mesmo formato dos prazos guardados no pedido) depois de `days` dias úteis contados a partir do dia
 * local da loja de `from`. Sábado e domingo não contam: sexta + 1 dia útil = segunda.
 */
export function addBusinessDays(from: Date, days: number): Date {
  let day = storeDayNumber(from);
  let left = Math.max(0, Math.floor(days));
  while (left > 0) {
    day += 1;
    if (isBusinessDay(day)) left -= 1;
  }
  return new Date(day * DAY_MS);
}

/** Dias úteis depois de `from` até `to` (inclusive): segunda a segunda dá 5. Zero se `to` não é depois de `from`. */
function businessDaysBetween(fromDay: number, toDay: number) {
  let count = 0;
  for (let day = fromDay + 1; day <= toDay; day++) if (isBusinessDay(day)) count += 1;
  return count;
}

export type DeadlineStatus =
  | { level: "ok"; remaining: number }
  | { level: "alerta"; remaining: number }
  | { level: "atrasado"; late: number };

/**
 * Situação do prazo de produção. "alerta" = faltam `alertWithin` dias úteis ou menos (com prazo de 10 dias úteis e alerta no 7º dia,
 * são 3). "atrasado" = o dia do prazo já passou. O prazo é uma data de meia-noite UTC; hoje conta no dia local da loja.
 */
export function deadlineStatus(deadlineIso: string, now: Date, alertWithin: number): DeadlineStatus {
  const today = storeDayNumber(now);
  const deadlineDay = Math.floor(new Date(deadlineIso).getTime() / DAY_MS);
  if (today > deadlineDay) return { level: "atrasado", late: Math.max(1, businessDaysBetween(deadlineDay, today)) };
  const remaining = businessDaysBetween(today, deadlineDay);
  return { level: remaining <= alertWithin ? "alerta" : "ok", remaining };
}
