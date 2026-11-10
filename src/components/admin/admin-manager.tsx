"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addAdminAction, removeAdminAction } from "@/app/admin/configuracoes/administradores/actions";
import { useToast } from "@/components/admin/toast";
import type { AdminView } from "@/server/repositories/admin-repository";

const FIELD = "w-full rounded-lg border border-mist bg-transparent px-3 py-2 text-base outline-none focus:border-petrol sm:text-sm";

export function AdminManager({ admins, selfEmail }: { admins: AdminView[]; selfEmail: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

  const add = () => {
    startTransition(async () => {
      const result = await addAdminAction({ email, name });
      if (!result.success) return toast(result.error, "error");
      toast(result.message);
      setEmail("");
      setName("");
      router.refresh();
    });
  };

  const remove = (id: string) => {
    startTransition(async () => {
      const result = await removeAdminAction(id);
      setConfirming(null);
      if (!result.success) return toast(result.error, "error");
      toast(result.message);
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <section className="admin-card rounded-xl border border-mist p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Adicionar administrador</h2>
        <p className="mb-4 mt-1 text-xs text-graphite">
          Informe o e-mail da pessoa. Se ela ainda não tem conta na loja, a conta é criada agora; ela entra em /login com o Google desse e-mail (ou usa &quot;Esqueci minha senha&quot;).
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-graphite" htmlFor="admin-email">
              E-mail
            </label>
            <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pessoa@gmail.com" className={FIELD} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-graphite" htmlFor="admin-name">
              Nome (opcional)
            </label>
            <input id="admin-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Como aparece no painel" className={FIELD} />
          </div>
          <div className="flex items-end">
            <button type="button" onClick={add} disabled={pending || !email.trim()} className="w-full rounded-lg bg-petrol px-4 py-2 text-sm font-medium text-white disabled:opacity-50 sm:w-auto">
              {pending ? "Salvando…" : "Adicionar"}
            </button>
          </div>
        </div>
      </section>

      <section className="admin-card rounded-xl border border-mist p-5 sm:p-6">
        <h2 className="text-sm font-semibold">Quem tem acesso ({admins.length})</h2>
        {admins.length === 0 ? <p className="mt-3 text-sm text-graphite">Nenhum administrador encontrado.</p> : null}
        <ul className="mt-3 divide-y divide-mist">
          {admins.map((a) => {
            const self = a.email.toLowerCase() === selfEmail.toLowerCase();
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {a.name} {self ? <span className="ml-1 rounded-full bg-petrol/15 px-2 py-0.5 text-[10px] text-petrol">você</span> : null}
                  </p>
                  <p className="truncate text-xs text-graphite">
                    {a.email}
                    {!a.verified ? " · ainda não entrou" : ""}
                  </p>
                </div>
                {self ? null : confirming === a.id ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-graphite">Tirar o acesso?</span>
                    <button type="button" onClick={() => remove(a.id)} disabled={pending} className="rounded-lg border border-red-500 px-3 py-1.5 font-medium text-red-500 disabled:opacity-50">
                      Sim, remover
                    </button>
                    <button type="button" onClick={() => setConfirming(null)} className="rounded-lg border border-mist px-3 py-1.5">
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirming(a.id)} className="rounded-lg border border-mist px-3 py-1.5 text-xs hover:border-red-500 hover:text-red-500">
                    Remover
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-graphite">Remover tira só o acesso ao painel; a conta de cliente da pessoa continua. A loja sempre mantém pelo menos um administrador.</p>
      </section>
    </div>
  );
}
