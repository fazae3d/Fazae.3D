"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateProductionAction } from "@/app/admin/producao/actions";

const STAGE_LABELS: Record<string, string> = {
  nao_aplicavel: "não está na produção",
  inicio: "na fila (Início)",
  em_producao: "em produção",
  finalizado: "finalizada",
};

/**
 * Situação do pedido na Produção. Pedido que não entrou na fila (ex.: venda manual com produto avulso, sem marcar "Produção pendente")
 * pode ser enviado para a produção aqui, sem refazer a venda.
 */
export function OrderProductionControl({ orderId, stage, cancelled }: { orderId: string; stage?: string; cancelled: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (cancelled) return null;

  const inProduction = stage && stage !== "nao_aplicavel";

  const send = async () => {
    setPending(true);
    setError(null);
    const result = await updateProductionAction(orderId, { stage: "inicio" });
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3 border-t border-mist pt-4 text-xs text-graphite">
      <span>
        <span className="label-caps text-[10px]">Produção</span> {STAGE_LABELS[stage ?? "nao_aplicavel"] ?? stage}
      </span>
      {inProduction ? (
        <Link href="/admin/producao" className="text-petrol hover:underline">
          Ver na Produção
        </Link>
      ) : (
        <button type="button" onClick={send} disabled={pending} className="rounded-lg border border-petrol px-3 py-1.5 text-petrol transition-colors hover:bg-petrol hover:text-[#111] disabled:opacity-60">
          {pending ? "Enviando..." : "Enviar para a produção"}
        </button>
      )}
      {error ? <span className="text-red-500">{error}</span> : null}
    </div>
  );
}
