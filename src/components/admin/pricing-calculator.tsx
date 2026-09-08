"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/format";

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
}: {
  productName?: string;
  initialMaterialCost: number;
  initialLaborCost?: number;
}) {
  const [materialCost, setMaterialCost] = useState(initialMaterialCost);
  const [printHours, setPrintHours] = useState(0);
  const [hourlyRate, setHourlyRate] = useState(0);
  const [laborCost, setLaborCost] = useState(initialLaborCost ?? 0);
  const [extraCost, setExtraCost] = useState(0);
  const [margin, setMargin] = useState(30);

  const printingCost = printHours * hourlyRate;
  const totalCost = materialCost + printingCost + laborCost + extraCost;
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
          <label className={labelClass()} htmlFor="extraCost">
            Custos extras / embalagem (R$)
          </label>
          <input
            id="extraCost"
            type="number"
            step="0.01"
            className={inputClass()}
            value={extraCost}
            onChange={(e) => setExtraCost(Number(e.target.value) || 0)}
          />
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

      <div className="flex flex-col gap-2 border border-mist bg-mist/20 p-5 text-sm">
        <p className="flex justify-between">
          <span className="text-graphite">Custo de material</span>
          <span>{formatPrice(materialCost)}</span>
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
          <span className="text-graphite">Custos extras / embalagem</span>
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
