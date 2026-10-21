"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCadenceActiveAction, stopEnrollmentAction } from "@/app/admin/conversas/cadencias/actions";
import { useToast } from "@/components/admin/toast";

export function StopEnrollmentButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await stopEnrollmentAction(id);
        setPending(false);
        if (!result.success) {
          toast(result.error, "error");
          return;
        }
        toast("Cadência parada para esse contato");
        router.refresh();
      }}
      className="text-xs text-graphite hover:text-red-400 hover:underline disabled:opacity-50"
    >
      Parar
    </button>
  );
}

export function CadenceActiveToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await setCadenceActiveAction(id, !active);
        setPending(false);
        if (!result.success) {
          toast(result.error, "error");
          return;
        }
        toast(active ? "Cadência pausada" : "Cadência ativada");
        router.refresh();
      }}
      className={`rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50 ${active ? "border-petrol/60 bg-petrol/15 text-petrol" : "border-mist text-graphite hover:border-petrol"}`}
      title={active ? "Clique para pausar" : "Clique para ativar"}
    >
      {active ? "Ativa" : "Pausada"}
    </button>
  );
}
