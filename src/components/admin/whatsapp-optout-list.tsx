"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setOptOutAction } from "@/app/admin/conversas/actions";
import { useToast } from "@/components/admin/toast";
import { formatPhone } from "@/lib/whatsapp";
import type { OptedOutContact } from "@/server/repositories/wa-settings-repository";

/** Lista de quem pediu para não receber mensagens, com a opção de reativar caso tenha sido engano. */
export function WhatsAppOptOutList({ contacts }: { contacts: OptedOutContact[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<string | null>(null);

  return (
    <div className="admin-card rounded-xl border border-mist p-5">
      <p className="font-medium">Quem pediu para não receber ({contacts.length})</p>
      <p className="mt-1 text-sm text-graphite">Esses contatos nunca recebem mensagens automáticas, nem manuais pelo painel. Reative só se a pessoa pediu para voltar ou se foi engano.</p>
      {contacts.length === 0 ? (
        <p className="mt-3 text-sm text-graphite">Ninguém por enquanto.</p>
      ) : (
        <ul className="mt-3 divide-y divide-mist">
          {contacts.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <Link href={`/admin/conversas?c=${c.id}`} className="min-w-0 truncate hover:text-petrol">
                {c.name ?? formatPhone(c.phone)} <span className="text-xs text-graphite">{c.name ? formatPhone(c.phone) : ""}</span>
              </Link>
              <button
                type="button"
                disabled={pending === c.id}
                onClick={async () => {
                  setPending(c.id);
                  const result = await setOptOutAction(c.id, false);
                  setPending(null);
                  if (!result.success) {
                    toast(result.error, "error");
                    return;
                  }
                  toast("Contato reativado");
                  router.refresh();
                }}
                className="shrink-0 text-xs text-petrol hover:underline disabled:opacity-50"
              >
                Reativar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
