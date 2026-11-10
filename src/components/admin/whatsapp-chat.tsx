"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { markReadAction, markUnreadAction, prepareAttachmentAction, sendAttachmentAction, sendMessageAction, updateLeadAction } from "@/app/admin/conversas/actions";
import { StatusBadge } from "@/components/admin/page-header";
import { formatDuration, recordingToMp3 } from "@/lib/audio-mp3";
import { renderMessage } from "@/lib/wa-cadence";
import { LEAD_STAGES, formatPhone } from "@/lib/whatsapp";
import type { QuickReplyView } from "@/server/repositories/wa-quick-reply-repository";
import type { WaConversationView, WaMessageView } from "@/server/repositories/whatsapp-repository";

const STORE_TZ = "America/Fortaleza";
const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;
const ATTACH_ACCEPT = "image/*,video/mp4,audio/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.stl,.3mf";

type Attachment = { blob: Blob; name: string; type: string; kind: "image" | "video" | "audio" | "document"; previewUrl: string };

/** WhatsApp: imagem, vídeo em MP4 e áudio vão como mídia; qualquer outro arquivo vai como documento. */
function kindOf(type: string): Attachment["kind"] {
  if (type.startsWith("image/")) return "image";
  if (type === "video/mp4") return "video";
  if (type.startsWith("audio/")) return "audio";
  return "document";
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

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
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <p className="mb-1 text-xs italic text-graphite">[{MEDIA_TEXT[type] ?? "arquivo"}: não deu para carregar aqui, abra no WhatsApp para ver]</p>;
  if (type === "image" || type === "sticker") {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="mb-1 block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="Imagem da conversa" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="max-h-64 max-w-full rounded-lg" />
      </a>
    );
  }
  if (type === "audio") return <audio controls src={url} onError={() => setFailed(true)} className="mb-1 max-w-full" preload="none" />;
  if (type === "video") return <video controls src={url} onError={() => setFailed(true)} className="mb-1 max-h-64 max-w-full rounded-lg" preload="none" />;
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
  initialText,
}: {
  conversation: WaConversationView;
  messages: WaMessageView[];
  quickReplies: QuickReplyView[];
  /** Texto já escrito na caixa (ex.: acompanhamento de orçamento); só vai quando a pessoa clica em Enviar. */
  initialText?: string;
}) {
  const router = useRouter();
  const [text, setText] = useState(initialText ?? "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const markedFor = useRef<string>("");
  const fileInput = useRef<HTMLInputElement>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const recordingChunks = useRef<Blob[]>([]);
  const recordingCancelled = useRef(false);
  // A etapa muda na hora na tela; se o servidor recusar, volta para a que estava salva.
  const [stage, setStage] = useState(conversation.stage);
  const [savedStage, setSavedStage] = useState(`${conversation.id}:${conversation.stage}`);
  if (savedStage !== `${conversation.id}:${conversation.stage}`) {
    setSavedStage(`${conversation.id}:${conversation.stage}`);
    setStage(conversation.stage);
  }

  const changeStage = async (next: string) => {
    if (next === stage) return;
    const previous = stage;
    setStage(next);
    setError(null);
    const result = await updateLeadAction(conversation.id, { stage: next });
    if (!result.success) {
      setStage(previous);
      setError(result.error);
      return;
    }
    router.refresh();
  };

  const markUnread = async () => {
    const result = await markUnreadAction(conversation.id);
    if (!result.success) {
      setError(result.error);
      return;
    }
    // Sai da conversa: se ficasse aberta, ela seria marcada como lida de novo na hora.
    router.push("/admin/conversas");
  };

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

  // Sair da conversa no meio de uma gravação solta o microfone.
  useEffect(
    () => () => {
      recordingCancelled.current = true;
      if (recorder.current?.state === "recording") recorder.current.stop();
    },
    [],
  );

  // Enquanto grava, conta os segundos na tela.
  useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [recording]);

  const clearAttachment = () => {
    if (attachment) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const chooseFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.size > MAX_ATTACHMENT_BYTES) {
      setError("O arquivo passa de 25 MB. Escolha um menor.");
      return;
    }
    const type = file.type || "application/octet-stream";
    clearAttachment();
    setAttachment({ blob: file, name: file.name, type, kind: kindOf(type), previewUrl: URL.createObjectURL(file) });
  };

  const startRecording = async () => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Este navegador não grava áudio. Use o Chrome, Edge ou Safari atualizados.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Sem acesso ao microfone. Permita o microfone para este site no navegador e tente de novo.");
      return;
    }
    clearAttachment();
    const media = new MediaRecorder(stream);
    recordingChunks.current = [];
    recordingCancelled.current = false;
    media.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunks.current.push(e.data);
    };
    media.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setRecording(false);
      if (recordingCancelled.current || recordingChunks.current.length === 0) return;
      try {
        const mp3 = await recordingToMp3(new Blob(recordingChunks.current, { type: media.mimeType || "audio/webm" }));
        setAttachment({ blob: mp3, name: "audio.mp3", type: "audio/mpeg", kind: "audio", previewUrl: URL.createObjectURL(mp3) });
      } catch {
        setError("Não foi possível preparar a gravação. Tente gravar de novo.");
      }
    };
    media.start();
    recorder.current = media;
    setSeconds(0);
    setRecording(true);
  };

  const stopRecording = (cancel: boolean) => {
    recordingCancelled.current = cancel;
    recorder.current?.stop();
  };

  /** Sobe o arquivo direto para o armazenamento (sem passar pelo servidor do site) e depois manda para o cliente. */
  const sendAttachment = async () => {
    if (!attachment || sending) return;
    setSending(true);
    setError(null);
    try {
      const prepared = await prepareAttachmentAction({ fileName: attachment.name, contentType: attachment.type, size: attachment.blob.size });
      if (!prepared.success) throw new Error(prepared.error);
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", new Blob([attachment.blob], { type: attachment.type }));
      const upload = await fetch(prepared.uploadUrl, { method: "PUT", body: form, headers: { "x-upsert": "false" } });
      if (!upload.ok) throw new Error("Não foi possível subir o arquivo. Confira a internet e tente de novo.");
      const result = await sendAttachmentAction({ conversationId: conversation.id, path: prepared.path, kind: attachment.kind, caption: text, fileName: attachment.name });
      if (!result.success) throw new Error(result.error);
      clearAttachment();
      setText("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar.");
      router.refresh();
    } finally {
      setSending(false);
    }
  };

  const send = async () => {
    if (attachment) return sendAttachment();
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
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-mist px-4 py-3">
        <Link href="/admin/conversas" className="text-sm text-graphite hover:text-ink lg:hidden" aria-label="Voltar para a lista">
          ←
        </Link>
        <div className="min-w-[9rem] flex-1">
          <p className="truncate font-medium">{conversation.name ?? formatPhone(conversation.phone)}</p>
          <p className="truncate text-xs text-graphite">{formatPhone(conversation.phone)}</p>
        </div>
        <Link href={`/admin/orcamentos/novo?conversa=${conversation.id}`} className="shrink-0 rounded-lg border border-mist px-3 py-1.5 text-xs font-medium transition-colors hover:border-petrol">
          + Orçamento
        </Link>
        <button type="button" onClick={markUnread} className="shrink-0 rounded-lg border border-mist px-3 py-1.5 text-xs font-medium transition-colors hover:border-petrol" title="Volta a conversa para a lista como não lida e fecha esta tela">
          Marcar como não lida
        </button>
        {conversation.optedOut ? <StatusBadge tone="danger">Pediu para sair</StatusBadge> : null}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-mist px-4 py-2" role="group" aria-label="Etapa do contato">
        <span className="mr-1 text-xs text-graphite">Etapa:</span>
        {LEAD_STAGES.map((s) => {
          const active = stage === s.key;
          const tone = active ? (s.key === "ganho" ? "border-emerald-500 bg-emerald-500/15 text-emerald-400" : s.key === "perdido" ? "border-red-500 bg-red-500/15 text-red-400" : "border-petrol bg-petrol/15 text-petrol") : "border-mist text-graphite hover:border-petrol hover:text-ink";
          return (
            <button key={s.key} type="button" onClick={() => changeStage(s.key)} aria-pressed={active} className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${tone}`}>
              {s.label}
            </button>
          );
        })}
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
            {attachment ? (
              <div className="mb-2 flex items-center gap-3 rounded-xl border border-mist p-2 text-sm">
                {attachment.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachment.previewUrl} alt="Prévia do anexo" className="h-14 w-14 rounded-lg object-cover" />
                ) : null}
                <div className="min-w-0 flex-1">
                  {attachment.kind === "audio" ? (
                    <audio controls src={attachment.previewUrl} className="h-9 w-full max-w-xs" />
                  ) : (
                    <p className="truncate font-medium">{attachment.name}</p>
                  )}
                  <p className="text-xs text-graphite">
                    {attachment.kind === "audio" ? "Mensagem de áudio" : attachment.kind === "image" ? "Imagem" : attachment.kind === "video" ? "Vídeo" : "Documento"} · {formatSize(attachment.blob.size)}
                    {attachment.kind !== "audio" ? " · o texto abaixo vai como legenda" : ""}
                  </p>
                </div>
                <button type="button" onClick={clearAttachment} className="rounded-lg border border-mist px-2.5 py-1.5 text-xs hover:border-red-500 hover:text-red-500">
                  Remover
                </button>
              </div>
            ) : null}
            {recording ? (
              <div className="flex items-center gap-3 rounded-xl border border-red-500/60 px-3 py-2.5 text-sm">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" aria-hidden="true" />
                <span className="flex-1">Gravando {formatDuration(seconds)}</span>
                <button type="button" onClick={() => stopRecording(true)} className="rounded-lg border border-mist px-3 py-1.5 text-xs hover:border-red-500 hover:text-red-500">
                  Cancelar
                </button>
                <button type="button" onClick={() => stopRecording(false)} className="rounded-lg bg-petrol px-3 py-1.5 text-xs font-semibold text-[#111]">
                  Parar
                </button>
              </div>
            ) : (
            <div className="flex items-end gap-2">
              <input ref={fileInput} type="file" accept={ATTACH_ACCEPT} className="hidden" onChange={(e) => chooseFile(e.target.files?.[0])} />
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={sending}
                title="Anexar foto, vídeo ou documento"
                aria-label="Anexar arquivo"
                className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-xl border border-mist text-graphite hover:border-petrol hover:text-ink disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.9-8.9a3.4 3.4 0 0 1 4.8 4.8l-8.9 8.9a1.8 1.8 0 0 1-2.5-2.5l8.2-8.2" />
                </svg>
              </button>
              <button
                type="button"
                onClick={startRecording}
                disabled={sending || Boolean(attachment)}
                title="Gravar áudio"
                aria-label="Gravar áudio"
                className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-xl border border-mist text-graphite hover:border-petrol hover:text-ink disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="9" y="3" width="6" height="11" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
                </svg>
              </button>
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
                placeholder={attachment && attachment.kind !== "audio" ? "Legenda (opcional)" : "Mensagem (digite / para respostas rápidas)"}
                className="min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || (!attachment && !text.trim())}
                className="rounded-xl bg-petrol px-4 py-2.5 text-sm font-semibold text-[#111] disabled:opacity-50"
              >
                {sending ? "Enviando…" : "Enviar"}
              </button>
            </div>
            )}
            {error ? <p className="mt-1.5 text-xs text-red-500">{error}</p> : null}
          </>
        )}
      </div>
    </div>
  );
}
