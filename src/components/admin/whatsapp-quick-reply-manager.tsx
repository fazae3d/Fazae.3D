"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteQuickReplyAction, saveQuickReplyAction } from "@/app/admin/conversas/ajustes/actions";
import { useToast } from "@/components/admin/toast";
import { slugifyShortcut } from "@/lib/whatsapp";
import type { QuickReplyView } from "@/server/repositories/wa-quick-reply-repository";

const FIELD = "w-full rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol";

/** Cadastro das respostas rápidas: título, atalho (/prazo) e a mensagem que entra no campo de texto do chat. */
export function WhatsAppQuickReplyManager({ replies }: { replies: QuickReplyView[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [shortcut, setShortcut] = useState("");
  const [shortcutTouched, setShortcutTouched] = useState(false);
  const [body, setBody] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const open = (reply: QuickReplyView | null) => {
    setEditing(reply?.id ?? "new");
    setTitle(reply?.title ?? "");
    setShortcut(reply?.shortcut ?? "");
    setShortcutTouched(Boolean(reply));
    setBody(reply?.body ?? "");
    setError(null);
  };

  const save = async () => {
    setPending(true);
    setError(null);
    const result = await saveQuickReplyAction(editing === "new" ? null : editing, { title, shortcut, body });
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    toast("Resposta salva");
    setEditing(null);
    router.refresh();
  };

  const remove = async (id: string) => {
    setPending(true);
    const result = await deleteQuickReplyAction(id);
    setPending(false);
    setConfirmDelete(null);
    if (!result.success) {
      toast(result.error, "error");
      return;
    }
    toast("Resposta excluída");
    router.refresh();
  };

  return (
    <div className="admin-card rounded-xl border border-mist p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">Respostas rápidas</p>
          <p className="mt-1 text-sm text-graphite">
            Textos que você manda toda hora (prazo, formas de pagamento, endereço). No chat, digite <code className="rounded bg-mist px-1">/</code> e o atalho, e a mensagem aparece pronta no campo. <code className="rounded bg-mist px-1">{"{{nome}}"}</code> vira o primeiro nome do cliente.
          </p>
        </div>
        {editing === null ? (
          <button type="button" onClick={() => open(null)} className="rounded-lg bg-petrol px-4 py-2 text-sm font-semibold text-[#111]">
            + Nova resposta
          </button>
        ) : null}
      </div>

      {editing !== null ? (
        <div className="mt-4 space-y-3 rounded-lg border border-mist p-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
            <label className="block text-xs text-graphite">
              Título
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!shortcutTouched) setShortcut(slugifyShortcut(e.target.value));
                }}
                placeholder="Ex.: Prazo de entrega"
                className={`${FIELD} mt-1`}
              />
            </label>
            <label className="block text-xs text-graphite">
              Atalho
              <div className="mt-1 flex items-center gap-1">
                <span className="text-sm text-graphite">/</span>
                <input
                  value={shortcut}
                  onChange={(e) => {
                    setShortcut(slugifyShortcut(e.target.value));
                    setShortcutTouched(true);
                  }}
                  placeholder="prazo"
                  className={FIELD}
                />
              </div>
            </label>
          </div>
          <label className="block text-xs text-graphite">
            Mensagem
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} maxLength={2000} placeholder="Olá {{nome}}! O prazo de produção é de 7 a 10 dias úteis depois da confirmação do pagamento." className={`${FIELD} mt-1`} />
          </label>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
          <div className="flex items-center gap-3">
            <button type="button" onClick={save} disabled={pending} className="rounded-lg bg-petrol px-4 py-2 text-sm font-semibold text-[#111] disabled:opacity-60">
              {pending ? "Salvando…" : "Salvar"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="text-sm text-graphite hover:text-ink">
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {replies.length === 0 && editing === null ? (
        <p className="mt-4 text-sm text-graphite">Nenhuma resposta ainda. Comece pelas perguntas que mais chegam: prazo, formas de pagamento, endereço, frete.</p>
      ) : (
        <ul className="mt-4 divide-y divide-mist">
          {replies.map((r) => (
            <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-medium">/{r.shortcut}</span> <span className="text-graphite">· {r.title}</span>
                </p>
                <p className="mt-0.5 line-clamp-2 whitespace-pre-wrap text-xs text-graphite">{r.body}</p>
              </div>
              {confirmDelete === r.id ? (
                <span className="flex items-center gap-2 text-xs">
                  <span className="text-graphite">Excluir?</span>
                  <button type="button" onClick={() => remove(r.id)} disabled={pending} className="font-semibold text-red-400 hover:underline">
                    Sim
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(null)} className="text-graphite hover:text-ink">
                    Não
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-3 text-xs">
                  <button type="button" onClick={() => open(r)} className="text-petrol hover:underline">
                    Editar
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(r.id)} className="text-graphite hover:text-red-400 hover:underline">
                    Excluir
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
