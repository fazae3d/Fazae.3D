"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * O precificador é uma ferramenta de arquivo único (HTML + JS próprio, lê STL/3MF/gcode no navegador), por isso
 * roda isolado num iframe. Para não parecer "uma página dentro da página", o quadro cresce junto com o conteúdo
 * (sem barra de rolagem própria) e a ferramenta usa as cores e o tema do painel (ver app/route.ts).
 */
export function PrecificadorFrame() {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(640);

  const measure = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (!doc) return;
    const next = Math.ceil(Math.max(doc.body?.scrollHeight ?? 0, doc.documentElement.scrollHeight));
    if (next > 0) setHeight((prev) => (Math.abs(prev - next) > 2 ? next : prev));
  }, []);

  const attach = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (!doc?.body) return undefined;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(doc.body);
    return () => observer.disconnect();
  }, [measure]);

  useEffect(() => {
    let detach: (() => void) | undefined;
    const iframe = ref.current;
    const onLoad = () => {
      detach?.();
      detach = attach();
    };
    iframe?.addEventListener("load", onLoad);
    // Se o iframe já carregou antes do React anexar o listener.
    if (iframe?.contentDocument?.readyState === "complete") onLoad();
    return () => {
      iframe?.removeEventListener("load", onLoad);
      detach?.();
    };
  }, [attach]);

  return (
    <iframe
      ref={ref}
      src="/admin/precificacao/app"
      title="Precificador 3D"
      scrolling="no"
      style={{ height }}
      className="block w-full border-0"
    />
  );
}
