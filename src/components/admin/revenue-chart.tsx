import type { DayRevenue } from "@/lib/admin-stats";
import { formatPrice } from "@/lib/format";

const CHART_HEIGHT = 100;
const BAR_UNIT = 24;

/** `previous` = o mesmo número de dias imediatamente antes, para comparar ("▲ 20% sobre o período anterior"). */
export function RevenueChart({ data, previous }: { data: DayRevenue[]; previous?: DayRevenue[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const hasRevenue = data.some((d) => d.revenue > 0);
  const total = data.reduce((sum, d) => sum + d.revenue, 0);
  const previousTotal = previous?.reduce((sum, d) => sum + d.revenue, 0) ?? 0;
  const change = previous && previousTotal > 0 ? Math.round(((total - previousTotal) / previousTotal) * 100) : null;

  return (
    <div className="border border-mist p-5">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-semibold">Faturamento nos últimos {data.length} dias</p>
        <p className="text-xs text-graphite">
          <span className="text-base font-semibold text-ink">{formatPrice(total)}</span>
          {change !== null ? (
            <span className={`ml-2 font-medium ${change >= 0 ? "text-petrol" : "text-red-500"}`}>
              {change >= 0 ? "▲" : "▼"} {Math.abs(change)}% sobre os {data.length} dias anteriores
            </span>
          ) : previous && previousTotal === 0 && total > 0 ? (
            <span className="ml-2 font-medium text-petrol">sem vendas nos {data.length} dias anteriores</span>
          ) : null}
        </p>
      </div>
      {hasRevenue ? (
        <>
          <svg
            viewBox={`0 0 ${data.length * BAR_UNIT} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            className="h-32 w-full"
          >
            {data.map((day, i) => {
              const height = Math.max(2, (day.revenue / max) * (CHART_HEIGHT - 4));
              return (
                <rect
                  key={day.date}
                  x={i * BAR_UNIT + 4}
                  y={CHART_HEIGHT - height}
                  width={BAR_UNIT - 8}
                  height={height}
                  className={day.revenue > 0 ? "fill-petrol" : "fill-mist"}
                >
                  <title>{`${day.label}: ${formatPrice(day.revenue)}`}</title>
                </rect>
              );
            })}
          </svg>
          <div className="mt-2 flex justify-between text-[10px] text-graphite">
            <span>{data[0]?.label}</span>
            <span>{data[data.length - 1]?.label}</span>
          </div>
        </>
      ) : (
        <div className="flex h-32 items-center justify-center text-xs text-graphite">
          Nenhum pedido registrado no período.
        </div>
      )}
    </div>
  );
}
