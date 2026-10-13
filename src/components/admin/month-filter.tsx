"use client";

import { useRouter } from "next/navigation";
import { Select, type SelectOption } from "@/components/select";

/** Filtro de mês da tela de Finanças: escolher um mês já atualiza a tela (sem botão Aplicar). */
export function MonthFilter({ value, options }: { value: string; options: SelectOption[] }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3">
      <span className="label-caps text-[11px] text-graphite">Mês</span>
      <Select
        value={value}
        onChange={(mes) => router.replace(mes ? `/admin/financas?mes=${mes}` : "/admin/financas")}
        className="min-w-[220px] border border-mist bg-paper px-3 py-2.5 text-sm focus:border-petrol"
        options={options}
      />
    </div>
  );
}
