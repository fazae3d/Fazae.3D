"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";
import type { AdditionalCost } from "@/server/types";

function labelClass() {
  return "label-caps text-[11px] text-graphite";
}

function inputClass() {
  return "border border-mist px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm";
}

export function PricingCalculator({
  productName,
  initialMaterialCost,
  initialLaborCost,
  defaults,
  additionalCosts = [],
}: {
  productName?: string;
  initialMaterialCost: number;
  initialLaborCost?: number;
  defaults?: {
    defaultProfitMarginPct?: number;
    averageFailureRatePct?: number;
    printerCostPerHour?: number;
    energyCostPerHour?: number;
  };
  additionalCosts?: AdditionalCost[];
}) {
  const [materialCost, setMaterialCost] = useState(initialMaterialCost);
  const [printHours, setPrintHours] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(
    (defaults?.printerCostPerHour ?? 0) + (defaults?.energyCostPerHour ?? 0),
  );
  const [laborCost, setLaborCost] = useState(initialLaborCost ?? 0);
  const [failureRate, setFailureRate] = useState(defaults?.averageFailureRatePct ?? 0);
  const [selectedCostIds, setSelectedCostIds] = useState<string[]>([]);
  const [otherCosts, setOtherCosts] = useState(0);
  const [margin, setMargin] = useState(defaults?.defaultProfitMarginPct ?? 30);

  const toggleCost = (id: string) => {
    setSelectedCostIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));
  };

  // Taxa de falha infla o custo de material para cobrir peças perdidas: a
  // cada 100 unidades boas, uma taxa de 5% significa ~5 unidades extras de
  // material consumidas por falhas de impressão.
  const failureAdjustedMaterialCost =
    failureRate >= 100 ? materialCost : materialCost / (1 - failureRate / 100);
  const printingCost = printHours * hourlyRate;
  const selectedAdditionalTotal = additionalCosts
    .filter((c) => selectedCostIds.includes(c.id))
    .reduce((sum, c) => sum + c.value, 0);
  const extraCost = selectedAdditionalTotal + otherCosts;
  const totalCost = failureAdjustedMaterialCost + printingCost + laborCost + extraCost;
  const suggestedPrice = totalCost * (1 + margin / 100);

  return (
    <div className="flex flex-col gap-6">
      {productName && (
        <p className="border border-petrol/40 bg-petrol/10 px-4 py-3 text-sm">
          Calculando para <span className="font-medium">{productName}</span>: custo de material e mão de obra
          pré-preenchidos a partir da ficha técnica do produto.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="materialCost">
            Custo de material (R$)
          </label>
          <input
            id="materialCost"
            type="number"
            step="0.01"
            className={inputClass()}
            value={materialCost}
            onChange={(e) => setMaterialCost(Number(e.target.value) || 0)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="laborCost">
            Mão de obra (R$)
          </label>
          <input
            id="laborCost"
            type="number"
            step="0.01"
            className={inputClass()}
            value={laborCost}
            onChange={(e) => setLaborCost(Number(e.target.value) || 0)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="printHours">
            Horas de impressão
          </label>
          <input
            id="printHours"
            type="number"
            step="0.1"
            className={inputClass()}
            value={printHours}
            onChange={(e) => setPrintHours(Number(e.target.value) || 0)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="hourlyRate">
            Custo por hora de impressão (R$/h)
          </label>
          <input
            id="hourlyRate"
            type="number"
            step="0.01"
            className={inputClass()}
            value={hourlyRate}
            onChange={(e) => setHourlyRate(Number(e.target.value) || 0)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="failureRate">
            Taxa de falha (%)
          </label>
          <input
            id="failureRate"
            type="number"
            step="1"
            max={99}
            className={inputClass()}
            value={failureRate}
            onChange={(e) => setFailureRate(Math.min(99, Number(e.target.value) || 0))}
          />
          <p className="text-xs text-graphite">Ajusta o custo de material para cobrir peças perdidas.</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className={labelClass()} htmlFor="margin">
            Margem desejada (%)
          </label>
          <input
            id="margin"
            type="number"
            step="1"
            className={inputClass()}
            value={margin}
            onChange={(e) => setMargin(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <p className={labelClass()}>Custos adicionais</p>
        {additionalCosts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {additionalCosts.map((cost) => (
              <button
                key={cost.id}
                type="button"
                onClick={() => toggleCost(cost.id)}
                className={`label-caps rounded-full border px-3.5 py-2 text-[11px] transition-colors ${
                  selectedCostIds.includes(cost.id)
                    ? "border-petrol bg-petrol text-ink"
                    : "border-mist text-graphite hover:border-petrol"
                }`}
              >
                {cost.name} · {formatPrice(cost.value)}
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-col gap-1.5 sm:max-w-xs">
          <label className={labelClass()} htmlFor="otherCosts">
            Outros custos (R$)
          </label>
          <input
            id="otherCosts"
            type="number"
            step="0.01"
            className={inputClass()}
            value={otherCosts}
            onChange={(e) => setOtherCosts(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 border border-mist bg-mist/20 p-5 text-sm">
        <p className="flex justify-between">
          <span className="text-graphite">
            Custo de material{failureRate > 0 ? ` (com ${failureRate}% de falha)` : ""}
          </span>
          <span>{formatPrice(failureAdjustedMaterialCost)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-graphite">Impressão ({printHours}h × {formatPrice(hourlyRate)})</span>
          <span>{formatPrice(printingCost)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-graphite">Mão de obra</span>
          <span>{formatPrice(laborCost)}</span>
        </p>
        <p className="flex justify-between">
          <span className="text-graphite">Custos adicionais</span>
          <span>{formatPrice(extraCost)}</span>
        </p>
        <div className="my-1 border-t border-mist" />
        <p className="flex justify-between font-medium">
          <span>Soma dos custos</span>
          <span>{formatPrice(totalCost)}</span>
        </p>
        <p className="flex justify-between text-base font-medium text-petrol">
          <span>Preço sugerido ({margin}% de margem)</span>
          <span>{formatPrice(suggestedPrice)}</span>
        </p>
      </div>
    </div>
  );
}
