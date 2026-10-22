"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  postponeEnrollmentAction,
  resumeEnrollmentAction,
  sendEnrollmentNowAction,
  stopEnrollmentAction,
  stopManyEnrollmentsAction,
} from "@/app/admin/conversas/cadencias/actions";
import { useToast } from "@/components/admin/toast";

const LINK = "text-xs hover:underline disabled:opacity-50";

/** Ações de cada linha da fila: enviar agora, adiar 1 dia ou cancelar (com confirmação nas que não têm volta). */
export function QueueRowActions({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<null | "send" | "cancel">(null);
  const [pending, setPending] = useState(false);

  const run = async (task: () => Promise<{ success: boolean; error?: string }>, okMessage: (r: never) => string) => {
    setPending(true);
    const result = (await task()) as { success: boolean; error?: string };
    setPending(false);
    setConfirm(null);
    if (!result.success) {
      toast(result.error ?? "Não foi possível concluir.", "error");
      return;
    }
    toast(okMessage(result as never));
    router.refresh();
  };

  if (confirm) {
    return (
      <span className="flex flex-wrap items-center justify-end gap-2 text-xs">
        <span className="text-graphite">{confirm === "send" ? `Enviar agora para ${name}?` : `Cancelar para ${name}?`}</span>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            confirm === "send"
              ? run(
                  () => sendEnrollmentNowAction(id),
                  (r: { outcome?: string }) =>
                    r.outcome === "sent"
                      ? "Mensagem enviada"
                      : r.outcome === "failed"
                        ? "O envio falhou. Veja o motivo na conversa."
                        : r.outcome === "stopped"
                          ? "Não enviado: o contato respondeu ou pediu para sair."
                          : "Cadência concluída",
                )
              : run(() => stopEnrollmentAction(id), () => "Cadência cancelada para esse contato")
          }
          className={`${LINK} font-semibold ${confirm === "send" ? "text-petrol" : "text-red-400"}`}
        >
          {pending ? "…" : "Sim"}
        </button>
        <button type="button" onClick={() => setConfirm(null)} className={`${LINK} text-graphite`}>
          Não
        </button>
      </span>
    );
  }

  return (
    <span className="flex items-center justify-end gap-3">
      <button type="button" onClick={() => setConfirm("send")} className={`${LINK} font-medium text-petrol`}>
        Enviar agora
      </button>
      <button type="button" disabled={pending} onClick={() => run(() => postponeEnrollmentAction(id, 24), () => "Adiado em 1 dia")} className={`${LINK} text-graphite hover:text-ink`}>
        Adiar 1 dia
      </button>
      <button type="button" onClick={() => setConfirm("cancel")} className={`${LINK} text-graphite hover:text-red-400`}>
        Cancelar
      </button>
    </span>
  );
}

export function ResumeButton({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        const result = await resumeEnrollmentAction(id);
        setPending(false);
        if (!result.success) {
          toast(result.error, "error");
          return;
        }
        toast("Cadência retomada: volta para a fila");
        router.refresh();
      }}
      className={`${LINK} font-medium text-petrol`}
    >
      Retomar
    </button>
  );
}

/** Cancela de uma vez tudo que está na lista filtrada. */
export function BulkCancelButton({ ids }: { ids: string[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  if (ids.length === 0) return null;

  if (confirm) {
    return (
      <span className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-graphite">Cancelar a cadência de {ids.length} contato(s) desta lista?</span>
        <button
          type="button"
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const result = await stopManyEnrollmentsAction(ids);
            setPending(false);
            setConfirm(false);
            if (!result.success) {
              toast(result.error, "error");
              return;
            }
            toast(`${result.stopped} cadência(s) canceladas`);
            router.refresh();
          }}
          className="rounded-lg border border-red-500/60 px-3 py-1.5 text-red-400 hover:bg-red-500/10 disabled:opacity-60"
        >
          {pending ? "Cancelando…" : "Sim, cancelar todos"}
        </button>
        <button type="button" onClick={() => setConfirm(false)} className="text-graphite hover:text-ink">
          Não
        </button>
      </span>
    );
  }
  return (
    <button type="button" onClick={() => setConfirm(true)} className="rounded-lg border border-mist px-3 py-1.5 text-sm text-graphite hover:border-red-500/60 hover:text-red-400">
      Cancelar todos desta lista ({ids.length})
    </button>
  );
}
