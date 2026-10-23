"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { restoreAuditEntryAction } from "@/app/admin/atividade/actions";
import { useToast } from "@/components/admin/toast";

/** "Desfazer" uma alteração registrada (pede confirmação antes). */
export function AuditRestoreButton({ id, kind }: { id: string; kind: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setPending(true);
    setError(null);
    const result = await restoreAuditEntryAction(id);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      setConfirm(false);
      return;
    }
    toast(kind === "delete" ? "Registro recriado" : "Alteração desfeita");
    setConfirm(false);
    router.refresh();
  };

  return (
    <span className="inline-flex flex-wrap items-center gap-2 text-xs">
      {confirm ? (
        <>
          <span className="text-graphite">{kind === "delete" ? "Recriar este registro?" : "Voltar aos valores de antes?"}</span>
          <button type="button" onClick={run} disabled={pending} className="font-semibold text-petrol hover:underline disabled:opacity-60">
            {pending ? "Desfazendo…" : "Sim, desfazer"}
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="text-graphite hover:text-ink">
            Não
          </button>
        </>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className="font-medium text-petrol hover:underline">
          {kind === "delete" ? "Recriar" : "Desfazer"}
        </button>
      )}
      {error ? <span className="w-full text-red-500">{error}</span> : null}
    </span>
  );
}
