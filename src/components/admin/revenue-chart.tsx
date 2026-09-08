import type { DayRevenue } from "@/lib/admin-stats";
import { formatPrice } from "@/lib/format";

const CHART_HEIGHT = 100;
const BAR_UNIT = 24;

export function RevenueChart({ data }: { data: DayRevenue[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const hasRevenue = data.some((d) => d.revenue > 0);

  return (
    <div className="border border-mist p-5">
      <p className="label-caps mb-4 text-[11px] text-graphite">Faturamento nos últimos {data.length} dias</p>
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
