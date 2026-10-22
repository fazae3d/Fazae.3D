import Link from "next/link";
import { EmptyState } from "@/components/admin/empty-state";
import { CadenceActiveToggle } from "@/components/admin/whatsapp-cadence-controls";
import { PageHeader, StatusBadge } from "@/components/admin/page-header";
import { WhatsAppAutoSendPanel } from "@/components/admin/whatsapp-auto-send-panel";
import { withReadFallback } from "@/lib/db-fallback";
import { CADENCE_KINDS, CADENCE_PRESETS, describeAudience, describeDelay, describeSchedule, hasAudience, kindLabel } from "@/lib/wa-cadence";
import { sourceLabel, stageLabel } from "@/lib/whatsapp";
import { getWhatsAppProvider } from "@/server/whatsapp/provider";
import { getSendBudget, getWaConfig, listCadences, type CadenceView, type SendBudget, type WaConfigView } from "@/server/repositories/wa-cadence-repository";

export const dynamic = "force-dynamic";

const FALLBACK_CONFIG: WaConfigView = { autoSendEnabled: false, dailyLimit: 100, windowStartHour: 8, windowEndHour: 18 };
const FALLBACK_BUDGET: SendBudget = { limit: 20, sentToday: 0, remaining: 20 };

export default async function CadenciasPage() {
  const [config, cadences] = await Promise.all([
    withReadFallback(() => getWaConfig(), FALLBACK_CONFIG),
    withReadFallback(() => listCadences(), [] as CadenceView[]),
  ]);
  const budget = await withReadFallback(() => getSendBudget(new Date(), config), FALLBACK_BUDGET);
  const simulated = getWhatsAppProvider().name === "simulador";

  return (
    <div>
      <PageHeader
        title="Cadências"
        description="Sequências de mensagens automáticas: você escreve uma vez e o painel envia no prazo certo, parando quando o contato responde."
        actions={
          <Link href="/admin/conversas/importar" className="rounded-lg border border-mist px-4 py-2 text-sm hover:border-petrol">
            Importar lista
          </Link>
        }
      />

      <WhatsAppAutoSendPanel config={config} budget={budget} simulated={simulated} />

      <p className="label-caps mb-3 text-[11px] text-graphite">Suas cadências</p>
      {cadences.length === 0 ? (
        <div className="mb-8">
          <EmptyState icon="chat" title="Nenhuma cadência ainda" description="Comece por um dos modelos abaixo: já vêm com mensagens prontas que você pode editar." />
        </div>
      ) : (
        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          {cadences.map((c) => (
            <div key={c.id} className="admin-card flex flex-col rounded-xl border border-mist p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/admin/conversas/cadencias/${c.id}`} className="font-medium hover:text-petrol">
                    {c.name}
                  </Link>
                  <p className="mt-1">
                    <StatusBadge tone="info">{kindLabel(c.kind)}</StatusBadge>
                  </p>
                </div>
                <CadenceActiveToggle id={c.id} active={c.active} />
              </div>
              <ol className="mt-3 space-y-1 text-xs text-graphite">
                {c.steps.map((s, i) => (
                  <li key={i} className="truncate">
                    <span className="text-ink">{i + 1}.</span> {describeDelay(s.delayHours, i === 0)} — {s.text}
                  </li>
                ))}
              </ol>
              <dl className="mt-3 space-y-1 text-xs text-graphite">
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0">Quando</dt>
                  <dd className="text-ink">{describeSchedule(c.schedule, config)}</dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0">Para quem</dt>
                  <dd className="text-ink">
                    {c.autoEnroll && hasAudience(c.audience)
                      ? `Entrada automática: ${describeAudience(c.audience, { source: sourceLabel, stage: stageLabel })}`
                      : "Só quem você colocar ou importar"}
                  </dd>
                </div>
                <div className="flex gap-2">
                  <dt className="w-16 shrink-0">Repete</dt>
                  <dd className="text-ink">{c.repeatAfterDays ? `Sim, depois de ${c.repeatAfterDays} dias de concluída` : "Não"}</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-mist pt-3 text-xs text-graphite">
                <span>
                  <strong className="text-ink">{c.counts.ativa}</strong> em andamento · {c.counts.concluida} concluídos · {c.counts.parada} parados
                </span>
                <Link href={`/admin/conversas/cadencias/${c.id}`} className="text-petrol hover:underline">
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="label-caps mb-3 text-[11px] text-graphite">Criar uma nova cadência</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CADENCE_KINDS.map((k) => (
          <Link key={k.key} href={`/admin/conversas/cadencias/nova?tipo=${k.key}`} className="admin-card rounded-xl border border-mist p-4 transition-colors hover:border-petrol">
            <p className="font-medium">{k.label}</p>
            <p className="mt-1 text-xs text-graphite">{k.description}</p>
            <p className="mt-2 text-xs text-petrol">{k.key === "personalizada" ? "Começar do zero" : `Modelo com ${CADENCE_PRESETS[k.key].steps.length} mensagens`}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
