import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, StatusBadge, type BadgeTone } from "@/components/admin/page-header";
import { StopEnrollmentButton } from "@/components/admin/whatsapp-cadence-controls";
import { WhatsAppCadenceEditor } from "@/components/admin/whatsapp-cadence-editor";
import { withReadFallback } from "@/lib/db-fallback";
import { CADENCE_KINDS, CADENCE_PRESETS, type CadenceKind } from "@/lib/wa-cadence";
import { formatPhone } from "@/lib/whatsapp";
import { DEFAULT_SEND_DAYS } from "@/lib/wa-cadence";
import { getCadence, getWaConfig, listCadenceEnrollments, type EnrollmentView } from "@/server/repositories/wa-cadence-repository";

export const dynamic = "force-dynamic";

const STORE_TZ = "America/Fortaleza";
const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  ativa: { label: "Em andamento", tone: "info" },
  concluida: { label: "Concluída", tone: "success" },
  parada: { label: "Parada", tone: "neutral" },
};

function when(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  return `${date.toLocaleDateString("pt-BR", { timeZone: STORE_TZ, day: "2-digit", month: "2-digit" })} ${date.toLocaleTimeString("pt-BR", { timeZone: STORE_TZ, hour: "2-digit", minute: "2-digit" })}`;
}

export default async function CadenciaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tipo?: string }> }) {
  const { id } = await params;
  const { tipo } = await searchParams;
  const config = await withReadFallback(() => getWaConfig(), { autoSendEnabled: false, dailyLimit: 100, windowStartHour: 8, windowEndHour: 18 });
  const defaults = { windowStartHour: config.windowStartHour, windowEndHour: config.windowEndHour };

  if (id === "nova") {
    const kind: CadenceKind = CADENCE_KINDS.some((k) => k.key === tipo) ? (tipo as CadenceKind) : "personalizada";
    const preset = CADENCE_PRESETS[kind];
    return (
      <div>
        <PageHeader title="Nova cadência" description="Ajuste as mensagens e os prazos. Nada é enviado até você ligar o envio automático e colocar contatos nela." />
        <WhatsAppCadenceEditor
          id={null}
          initial={{
            name: preset.name,
            kind,
            active: true,
            steps: preset.steps,
            schedule: { sendDays: DEFAULT_SEND_DAYS, windowStartHour: null, windowEndHour: null },
            autoEnroll: false,
            audience: {},
            repeatAfterDays: null,
          }}
          defaults={defaults}
        />
      </div>
    );
  }

  const cadence = await withReadFallback(() => getCadence(id), null);
  if (!cadence) notFound();
  const enrollments = await withReadFallback(() => listCadenceEnrollments(id), [] as EnrollmentView[]);

  return (
    <div>
      <PageHeader
        title={cadence.name}
        description={`${cadence.counts.ativa} em andamento · ${cadence.counts.concluida} concluídos · ${cadence.counts.parada} parados`}
        actions={
          <Link href="/admin/conversas/importar" className="rounded-lg border border-mist px-4 py-2 text-sm hover:border-petrol">
            Importar lista para esta cadência
          </Link>
        }
      />
      <WhatsAppCadenceEditor
        id={cadence.id}
        initial={{
          name: cadence.name,
          kind: cadence.kind,
          active: cadence.active,
          steps: cadence.steps,
          schedule: cadence.schedule,
          autoEnroll: cadence.autoEnroll,
          audience: cadence.audience,
          repeatAfterDays: cadence.repeatAfterDays,
        }}
        defaults={defaults}
      />

      <p className="label-caps mb-3 mt-10 text-[11px] text-graphite">Quem está nesta cadência</p>
      {enrollments.length === 0 ? (
        <p className="text-sm text-graphite">Ninguém ainda. Importe uma lista ou coloque um contato pela ficha dele em Conversas.</p>
      ) : (
        <div className="admin-card overflow-x-auto rounded-xl border border-mist">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist text-xs text-graphite">
                <th className="px-4 py-3 font-medium">Contato</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 font-medium">Mensagem</th>
                <th className="px-4 py-3 font-medium">Próximo envio</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {enrollments.map((e) => {
                const status = STATUS[e.status] ?? { label: e.status, tone: "neutral" as BadgeTone };
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-3">
                      <Link href={`/admin/conversas?c=${e.conversationId}`} className="font-medium hover:text-petrol">
                        {e.name ?? formatPhone(e.phone)}
                      </Link>
                      {e.name ? <p className="text-xs text-graphite">{formatPhone(e.phone)}</p> : null}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
                      {e.status === "parada" && e.stopReason ? <p className="mt-0.5 text-xs text-graphite">{e.stopReason}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-graphite">
                      {Math.min(e.stepIndex, e.totalSteps)} de {e.totalSteps} enviadas
                    </td>
                    <td className="px-4 py-3 text-graphite">{e.status === "ativa" ? when(e.nextRunAt) : "—"}</td>
                    <td className="px-4 py-3 text-right">{e.status === "ativa" ? <StopEnrollmentButton id={e.id} /> : null}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
