import type { ReactNode } from "react";

/** Cabeçalho padrão das telas do painel: título, apoio e ações à direita. */
export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-2xl tracking-tight sm:text-[1.7rem]">{title}</h1>
        {description ? <p className="mt-1 text-sm text-graphite">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

const TONES = {
  neutral: "bg-mist text-graphite",
  info: "bg-sky-500/15 text-sky-400",
  success: "bg-petrol/15 text-petrol",
  warning: "bg-amber-500/15 text-amber-500",
  danger: "bg-red-500/15 text-red-400",
} as const;

export type BadgeTone = keyof typeof TONES;

/** Etiqueta de status (pago, pendente, vencido...), mesma forma e cores em todo o painel. */
export function StatusBadge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TONES[tone]}`}>{children}</span>;
}
