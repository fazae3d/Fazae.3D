"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AdminIcon } from "./admin-icons";

const POLL_MS = 5000;
const SOUND_KEY = "admin-chat-sound";
const SOUND_EVENT = "admin-chat-sound-change";

function soundEnabled(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

let audio: AudioContext | null = null;

function audioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audio) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audio = new Ctor();
  }
  return audio;
}

/** Dois toques curtos ("ding-dong"). Gerado na hora, sem arquivo de áudio. */
function playDing() {
  const ctx = audioContext();
  if (!ctx) return;
  void ctx.resume().then(() => {
    const start = ctx.currentTime + 0.02;
    [880, 1175].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const at = start + i * 0.18;
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.28, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.34);
    });
  });
}

/**
 * Mantém o painel em dia sem precisar recarregar: a cada 5 segundos pergunta ao servidor se chegou mensagem nova de cliente.
 * Se chegou (ou se o total de não lidas mudou), atualiza a tela atual (conversa, lista, balão do menu) e, se o som estiver ligado,
 * toca o aviso. A primeira consulta só serve de ponto de partida: abrir o painel não toca som.
 */
export function LiveUpdates() {
  const router = useRouter();
  const last = useRef<{ unread: number; lastInboundAt: string | null } | null>(null);

  // Navegadores só deixam tocar som depois que a pessoa mexeu na página uma vez: no primeiro clique/tecla liberamos o áudio.
  useEffect(() => {
    const unlock = () => {
      void audioContext()?.resume();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    let stopped = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/live", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const data = (await res.json()) as { unread: number; lastInboundAt: string | null };
        const before = last.current;
        last.current = data;
        if (!before) return;
        const newMessage = Boolean(data.lastInboundAt) && (!before.lastInboundAt || new Date(data.lastInboundAt as string) > new Date(before.lastInboundAt));
        if (newMessage && soundEnabled()) playDing();
        if (newMessage || data.unread !== before.unread) router.refresh();
      } catch {
        // sem internet ou servidor ocupado: tenta de novo no próximo ciclo
      }
    };
    void poll();
    const timer = setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router]);

  return null;
}

/** Botão do sino no topo do painel: liga e desliga o som de mensagem nova (a escolha fica guardada neste navegador). */
export function ChatSoundToggle() {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    const sync = () => setEnabled(soundEnabled());
    sync();
    window.addEventListener(SOUND_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SOUND_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = () => {
    const next = !enabled;
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      // sem armazenamento: vale só até recarregar
    }
    setEnabled(next);
    window.dispatchEvent(new Event(SOUND_EVENT));
    // O clique libera o áudio e já mostra como o aviso soa.
    if (next) playDing();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={enabled}
      aria-label={enabled ? "Desligar o som de mensagem nova" : "Ligar o som de mensagem nova"}
      title={enabled ? "Som de mensagem nova: ligado (clique para desligar)" : "Som de mensagem nova: desligado (clique para ligar)"}
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-mist text-graphite transition-colors hover:border-petrol hover:text-ink"
    >
      <AdminIcon name="bell" className="h-4 w-4" />
      {enabled ? null : <span aria-hidden="true" className="absolute h-[2px] w-5 rotate-45 rounded bg-current" />}
    </button>
  );
}
