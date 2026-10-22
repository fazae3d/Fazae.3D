"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { markReadAction, sendMessageAction } from "@/app/admin/conversas/actions";
import { StatusBadge } from "@/components/admin/page-header";
import { renderMessage } from "@/lib/wa-cadence";
import { formatPhone, stageLabel } from "@/lib/whatsapp";
import type { QuickReplyView } from "@/server/repositories/wa-quick-reply-repository";
import type { WaConversationView, WaMessageView } from "@/server/repositories/whatsapp-repository";

const STORE_TZ = "America/Fortaleza";

function formatTime(iso: string) {
  const date = new Date(iso);
  const day = (d: Date) => d.toLocaleDateString("pt-BR", { timeZone: STORE_TZ });
  const time = date.toLocaleTimeString("pt-BR", { timeZone: STORE_TZ, hour: "2-digit", minute: "2-digit" });
  return day(date) === day(new Date()) ? time : `${day(date).slice(0, 5)} ${time}`;
}

const STATUS_TEXT: Record<string, string> = { queued: "Enviando…", sent: "Enviada", delivered: "Entregue", read: "Lida", failed: "Falhou" };
const ORIGIN_TEXT: Record<string, string> = { cadencia: "cadência", campanha: "campanha", celular: "enviada do celular" };
const MEDIA_TEXT: Record<string, string> = {
  image: "imagem",
  video: "vídeo",
  audio: "áudio",
  document: "documento",
  sticker: "figurinha",
  location: "localização",
  contact: "contato",
};

function MediaBlock({ type, url }: { type: string; url: string | null }) {
  if (!url) return <p className="mb-1 text-xs italic text-graphite">[{MEDIA_TEXT[type] ?? "arquivo"} — abra no WhatsApp para ver]</p>;
  if (type === "image" || type === "sticker") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mb-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Imagem da conversa" loading="lazy" referrerPolicy="no-referrer" className="max-h-64 max-w-full rounded-lg" />
      </a>
    );
  }
  if (type === "audio") return <audio controls src={url} className="mb-1 max-w-full" preload="none" />;
  if (type === "video") return <video controls src={url} className="mb-1 max-h-64 max-w-full rounded-lg" preload="none" />;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mb-1 block text-xs text-petrol underline">
      Abrir {MEDIA_TEXT[type] ?? "arquivo"}
    </a>
  );
}

export function WhatsAppChat({
  conversation,
  messages,
  quickReplies,
}: {
  conversation: WaConversationView;
  messages: WaMessageView[];
  quickReplies: QuickReplyView[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const markedFor = useRef<string>("");

  // Mensagens novas aparecem sozinhas: atualiza de tempos em tempos enquanto a aba está aberta (o que se digita não se perde).
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) router.refresh();
    }, 7000);
    return () => clearInterval(timer);
  }, [router]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, conversation.id]);

  useEffect(() => {
    const key = `${conversation.id}:${conversation.unreadCount}`;
    if (conversation.unreadCount > 0 && markedFor.current !== key) {
      markedFor.current = key;
      void markReadAction(conversation.id).then(() => router.refresh());
    }
  }, [conversation.id, conversation.unreadCount, router]);

  // "/prazo" no começo do campo abre a lista de respostas rápidas; Enter ou Tab escolhe.
  const slash = text.startsWith("/") && !/\s/.test(text) ? text.slice(1).toLowerCase() : null;
  const suggestions =
    slash === null ? [] : quickReplies.filter((r) => r.shortcut.includes(slash) || r.title.toLowerCase().includes(slash)).slice(0, 6);
  const pick = (reply: QuickReplyView) => {
    setText(renderMessage(reply.body, { name: conversation.name }, () => 0));
    setActiveSuggestion(0);
  };

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    setError(null);
    const result = await sendMessageAction(conversation.id, text);
    setSending(false);
    if (!result.success) {
      setError(result.error);
      router.refresh();
      return;
    }
    setText("");
    router.refresh();
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-mist px-4 py-3">
        <Link href="/admin/conversas" className="text-sm text-graphite hover:text-ink lg:hidden" aria-label="Voltar para a lista">
          ←
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{conversation.name ?? formatPhone(conversation.phone)}</p>
          <p className="truncate text-xs text-graphite">{formatPhone(conversation.phone)}</p>
        </div>
        <Link href={`/admin/orcamentos/novo?conversa=${conversation.id}`} className="shrink-0 rounded-lg border border-mist px-3 py-1.5 text-xs font-medium transition-colors hover:border-petrol">
          + Orçamento
        </Link>
        <StatusBadge tone={conversation.stage === "ganho" ? "success" : conversation.stage === "perdido" ? "danger" : "info"}>{stageLabel(conversation.stage)}</StatusBadge>
        {conversation.optedOut ? <StatusBadge tone="danger">Pediu para sair</StatusBadge> : null}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? <p className="py-10 text-center text-sm text-graphite">Nenhuma mensagem ainda. Escreva abaixo para começar.</p> : null}
        {messages.map((m) => {
          const mine = m.direction === "out";
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm sm:max-w-[70%] ${mine ? "bg-petrol/20" : "bg-mist"} ${m.status === "failed" ? "ring-1 ring-red-500/60" : ""}`}>
                {m.mediaType ? <MediaBlock type={m.mediaType} url={m.mediaUrl} /> : null}
                {m.body ? <p className="whitespace-pre-wrap break-words">{m.body}</p> : null}
                <p className="mt-1 text-right text-[11px] text-graphite">
                  {mine && ORIGIN_TEXT[m.origin] ? `${ORIGIN_TEXT[m.origin]} · ` : ""}
                  {formatTime(m.createdAt)}
                  {mine ? <span className={m.status === "failed" ? "text-red-400" : m.status === "read" ? "text-petrol" : ""}> · {STATUS_TEXT[m.status] ?? m.status}</span> : null}
                </p>
                {m.error ? <p className="mt-1 text-xs text-red-400">{m.error}</p> : null}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-mist p-3">
        {conversation.optedOut ? (
          <p className="text-sm text-graphite">Esse contato pediu para não receber mensagens. Para voltar a escrever, reative nas opções ao lado.</p>
        ) : (
          <>
            {suggestions.length > 0 ? (
              <ul className="mb-2 overflow-hidden rounded-xl border border-mist bg-paper text-sm shadow-lg" role="listbox" aria-label="Respostas rápidas">
                {suggestions.map((r, i) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={i === activeSuggestion}
                      onMouseEnter={() => setActiveSuggestion(i)}
                      onClick={() => pick(r)}
                      className={`block w-full px-3 py-2 text-left ${i === activeSuggestion ? "bg-petrol/15" : "hover:bg-mist/60"}`}
                    >
                      <span className="font-medium">/{r.shortcut}</span> <span className="text-graphite">· {r.title}</span>
                      <span className="block truncate text-xs text-graphite">{r.body}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : slash !== null && quickReplies.length === 0 ? (
              <p className="mb-2 text-xs text-graphite">
                Você ainda não tem respostas rápidas.{" "}
                <Link href="/admin/conversas/ajustes" className="text-petrol hover:underline">
                  Cadastre em Ajustes
                </Link>
                .
              </p>
            ) : null}
            <div className="flex items-end gap-2">
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setActiveSuggestion(0);
                }}
                onKeyDown={(e) => {
                  if (suggestions.length > 0) {
                    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                      e.preventDefault();
                      setActiveSuggestion((i) => (e.key === "ArrowDown" ? (i + 1) % suggestions.length : (i - 1 + suggestions.length) % suggestions.length));
                      return;
                    }
                    if (e.key === "Enter" || e.key === "Tab") {
                      e.preventDefault();
                      pick(suggestions[Math.min(activeSuggestion, suggestions.length - 1)]);
                      return;
                    }
                    if (e.key === "Escape") {
                      setText("");
                      return;
                    }
                  }
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder="Escreva uma mensagem. Digite / para usar uma resposta rápida (Enter envia, Shift+Enter quebra a linha)"
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !text.trim()}
                className="rounded-xl bg-petrol px-4 py-2.5 text-sm font-semibold text-[#111] disabled:opacity-50"
              >
                {sending ? "Enviando…" : "Enviar"}
              </button>
            </div>
            {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
