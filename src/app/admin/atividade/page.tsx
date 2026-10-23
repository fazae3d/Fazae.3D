import Link from "next/link";
import { EmptyState } from "@/components/admin/empty-state";
import { AuditRestoreButton } from "@/components/admin/audit-restore-button";
import { PageHeader, StatusBadge, type BadgeTone } from "@/components/admin/page-header";
import { canRestore, describeChange, entryTitle, fieldLabel, formatAuditValue, modelLabel, rowName } from "@/lib/audit-format";
import { withReadFallback } from "@/lib/db-fallback";
import { AUDIT_PAGE_SIZE, listAudit, listAuditFacets, type AuditEntryView, type AuditFilters } from "@/server/repositories/audit-repository";

export const dynamic = "force-dynamic";

type SearchParams = { q?: string; quem?: string; tipo?: string; area?: string; de?: string; ate?: string; p?: string };

const KIND_TONES: Record<string, BadgeTone> = { create: "success", update: "info", delete: "danger", event: "neutral" };
const KIND_BADGE: Record<string, string> = { create: "Criou", update: "Alterou", delete: "Excluiu", event: "Ação" };
const KIND_FILTERS: [string, string][] = [
  ["", "Tudo"],
  ["update", "Alterações"],
  ["create", "Criações"],
  ["delete", "Exclusões"],
  ["event", "Ações"],
];

const FIELD = "w-full rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol";

function stamp(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })} às ${d.toLocaleTimeString("pt-BR", { timeZone: "America/Fortaleza", hour: "2-digit", minute: "2-digit" })}`;
}

function qs(filters: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) if (v) params.set(k, v);
  const text = params.toString();
  return text ? `?${text}` : "";
}

function eventDetails(details: unknown): string[] {
  if (!details || typeof details !== "object") return [];
  return Object.entries(details as Record<string, unknown>)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .slice(0, 8)
    .map(([k, v]) => `${fieldLabel(k)}: ${formatAuditValue(k, v)}`);
}

function Entry({ entry }: { entry: AuditEntryView }) {
  const info = entry.kind === "delete" ? entry.before : entry.after;
  const name = rowName(entry.targetType, info);
  const lines = entry.kind === "event" ? eventDetails(entry.details) : entry.changes.map(describeChange);
  const shown = lines.slice(0, 6);
  const rest = lines.slice(6);
  const restorable = canRestore({ kind: entry.kind, targetType: entry.targetType, restoredAt: entry.restoredAt });

  return (
    <li className="px-4 py-4 text-sm sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0">
          <StatusBadge tone={KIND_TONES[entry.kind] ?? "neutral"}>{KIND_BADGE[entry.kind] ?? entry.kind}</StatusBadge>{" "}
          <span className="font-medium">{entry.kind === "event" ? entryTitle(entry) : modelLabel(entry.targetType)}</span>
          {entry.kind !== "event" ? (
            <>
              {" "}
              <span className="text-graphite">{name ? `“${name}”` : entry.targetId}</span>
            </>
          ) : entry.targetId && entry.targetId !== "1" ? (
            <>
              {" "}
              <span className="text-graphite">{entry.targetId}</span>
            </>
          ) : null}
        </p>
        <p className="shrink-0 text-xs text-graphite">{stamp(entry.at)}</p>
      </div>
      <p className="mt-0.5 text-xs text-graphite">
        {entry.actorEmail}
      </p>

      {shown.length > 0 ? (
        <ul className="mt-2 space-y-0.5 text-xs">
          {shown.map((line, i) => (
            <li key={i} className="break-words text-ink/90">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      {rest.length > 0 ? (
        <details className="mt-1 text-xs">
          <summary className="cursor-pointer text-petrol">Ver mais {rest.length}</summary>
          <ul className="mt-1 space-y-0.5">
            {rest.map((line, i) => (
              <li key={i} className="break-words text-ink/90">
                {line}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-3">
        {restorable ? <AuditRestoreButton id={entry.id} kind={entry.kind} /> : null}
        {entry.restoredAt ? <span className="text-xs text-graphite">Desfeito por {entry.restoredBy} em {stamp(entry.restoredAt)}</span> : null}
      </div>
    </li>
  );
}

export default async function AdminActivityPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const filters: AuditFilters = { q: params.q, quem: params.quem, tipo: params.tipo, area: params.area, de: params.de, ate: params.ate };
  const page = Math.max(1, Number(params.p) || 1);
  const [{ entries, total }, facets] = await Promise.all([
    withReadFallback(() => listAudit(filters, page), { entries: [] as AuditEntryView[], total: 0 }),
    withReadFallback(() => listAuditFacets(), { actors: [] as string[], areas: [] as { key: string; label: string }[] }),
  ]);
  const pages = Math.max(1, Math.ceil(total / AUDIT_PAGE_SIZE));
  const base = { q: params.q, quem: params.quem, area: params.area, de: params.de, ate: params.ate };
  const filtered = Boolean(params.q || params.quem || params.tipo || params.area || params.de || params.ate);

  return (
    <div>
      <PageHeader
        title="Atividade"
        description="Tudo o que foi criado, alterado ou excluído no painel: quem fez, quando e o que mudou (de quanto para quanto). Dá para desfazer várias alterações."
        actions={
          <a href={`/admin/atividade/exportar${qs({ ...base, tipo: params.tipo })}`} className="rounded-lg border border-mist px-4 py-2 text-sm hover:border-petrol">
            Baixar planilha
          </a>
        }
      />

      <form action="/admin/atividade" className="admin-card mb-4 grid gap-3 rounded-xl border border-mist p-4 sm:grid-cols-2 lg:grid-cols-5">
        {params.tipo ? <input type="hidden" name="tipo" value={params.tipo} /> : null}
        <input name="q" defaultValue={params.q ?? ""} placeholder="Buscar (nome, código, ação)" className={`${FIELD} lg:col-span-2`} />
        <select name="quem" defaultValue={params.quem ?? ""} className={FIELD} aria-label="Quem fez">
          <option value="">Qualquer pessoa</option>
          {facets.actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select name="area" defaultValue={params.area ?? ""} className={FIELD} aria-label="Área">
          <option value="">Qualquer área</option>
          {facets.areas.map((a) => (
            <option key={a.key} value={a.key}>
              {a.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input type="date" name="de" defaultValue={params.de ?? ""} className={FIELD} aria-label="De" />
          <input type="date" name="ate" defaultValue={params.ate ?? ""} className={FIELD} aria-label="Até" />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2 lg:col-span-5">
          <button type="submit" className="rounded-lg bg-petrol px-4 py-2 text-sm font-semibold text-[#111]">
            Filtrar
          </button>
          {filtered ? (
            <Link href="/admin/atividade" className="text-sm text-graphite hover:text-ink">
              Limpar filtros
            </Link>
          ) : null}
        </div>
      </form>

      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {KIND_FILTERS.map(([key, label]) => (
          <Link
            key={key}
            href={`/admin/atividade${qs({ ...base, tipo: key || undefined })}`}
            className={`rounded-full border px-3 py-1.5 ${(params.tipo ?? "") === key ? "border-petrol bg-petrol/15" : "border-mist text-graphite hover:border-petrol"}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {entries.length === 0 ? (
        <EmptyState icon="settings" title={filtered ? "Nada encontrado com esses filtros" : "Nenhuma ação registrada ainda"} description="Criações, edições e exclusões feitas no painel aparecem aqui, com quem fez, quando e o que mudou." />
      ) : (
        <>
          <p className="mb-2 text-xs text-graphite">
            {total} registro(s){pages > 1 ? ` · página ${page} de ${pages}` : ""}
          </p>
          <ul className="admin-card divide-y divide-mist rounded-xl border border-mist">
            {entries.map((entry) => (
              <Entry key={entry.id} entry={entry} />
            ))}
          </ul>
          {pages > 1 ? (
            <div className="mt-4 flex items-center justify-between text-sm">
              {page > 1 ? (
                <Link href={`/admin/atividade${qs({ ...base, tipo: params.tipo, p: String(page - 1) })}`} className="text-petrol hover:underline">
                  ← Mais recentes
                </Link>
              ) : (
                <span />
              )}
              {page < pages ? (
                <Link href={`/admin/atividade${qs({ ...base, tipo: params.tipo, p: String(page + 1) })}`} className="text-petrol hover:underline">
                  Mais antigas →
                </Link>
              ) : null}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
