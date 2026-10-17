"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/admin/toast";
import { markOrdersPaidAction } from "@/app/admin/pedidos/actions";
import { formatPrice } from "@/lib/format";

function useMarkPaid(ids: string[]) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const run = async () => {
    setPending(true);
    const result = await markOrdersPaidAction(ids);
    setPending(false);
    setConfirming(false);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    toast(result.updated === 1 ? "Pedido marcado como pago" : `${result.updated} pedidos marcados como pagos`);
    router.refresh();
  };
  return { confirming, setConfirming, pending, run };
}

/** "Marcar como pago" de uma venda lançada no painel (com confirmação em um clique). */
export function MarkPaidButton({ id, total }: { id: string; total: number }) {
  const { confirming, setConfirming, pending, run } = useMarkPaid([id]);
  if (confirming) {
    return (
      <span className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-graphite">Confirmar {formatPrice(total)} recebido?</span>
        <button type="button" onClick={run} disabled={pending} className="font-semibold text-petrol hover:underline disabled:opacity-60">
          {pending ? "Salvando…" : "Sim, está pago"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-graphite hover:text-ink">
          Não
        </button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setConfirming(true)} className="mt-2 text-xs font-medium text-petrol hover:underline">
      Marcar como pago
    </button>
  );
}

/** Marca de uma vez todos os pedidos da lista filtrada (para quem já recebeu quase tudo). */
export function MarkAllPaidButton({ ids }: { ids: string[] }) {
  const { confirming, setConfirming, pending, run } = useMarkPaid(ids);
  if (ids.length === 0) return null;
  if (confirming) {
    return (
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-petrol/50 bg-petrol/10 px-3 py-2 text-sm">
        <span>
          Marcar <strong>{ids.length} pedido(s)</strong> como pagos? Confira a lista antes: quem ainda não pagou deve ficar de fora.
        </span>
        <button type="button" onClick={run} disabled={pending} className="rounded-lg bg-petrol px-4 py-1.5 font-semibold disabled:opacity-60">
          {pending ? "Salvando…" : "Sim, marcar todos"}
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="text-graphite hover:text-ink">
          Cancelar
        </button>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setConfirming(true)} className="rounded-lg border border-mist px-4 py-2 text-sm transition-colors hover:border-petrol">
      Marcar todos os {ids.length} como pagos
    </button>
  );
}
