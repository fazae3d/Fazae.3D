import Link from "next/link";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader, StatusBadge, type BadgeTone } from "@/components/admin/page-header";
import { withReadFallback } from "@/lib/db-fallback";
import { formatStoreDate } from "@/lib/quote";
import { getAllCampaigns } from "@/server/repositories/campaign-repository";
import { getActiveRecipients } from "@/server/repositories/campaign-repository";

export const metadata = { title: "Campanhas de e-mail" };

const STATUS: Record<string, { label: string; tone: BadgeTone }> = {
  rascunho: { label: "Rascunho", tone: "neutral" },
  enviando: { label: "Enviando", tone: "info" },
  parcial: { label: "Envio parcial", tone: "warning" },
  enviada: { label: "Enviada", tone: "success" },
};

export default async function CampaignsPage() {
  const [campaigns, recipients] = await Promise.all([
    withReadFallback(() => getAllCampaigns(), []),
    withReadFallback(() => getActiveRecipients(), []),
  ]);

  return (
    <div>
      <PageHeader
        title="Campanhas de e-mail"
        description={`Envie novidades, lançamentos e ofertas para quem aceitou receber (${recipients.length} contato(s) ativo(s)). Cada e-mail leva o link para a pessoa cancelar.`}
        actions={
          <>
            <Link href="/admin/clientes/contatos" className="rounded-lg border border-mist px-3.5 py-2 text-sm transition-colors hover:border-petrol">
              Ver contatos
            </Link>
            <Link href="/admin/clientes/campanhas/nova" className="rounded-lg bg-petrol px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
              Nova campanha
            </Link>
          </>
        }
      />

      <div className="admin-card mb-6 rounded-xl border border-mist p-4 text-sm text-graphite">
        <p className="font-medium text-ink">Como funciona</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>Clique em &ldquo;Nova campanha&rdquo;, escreva assunto, título e texto (a prévia aparece ao lado).</li>
          <li>Envie um teste para o seu próprio e-mail para conferir.</li>
          <li>Confirme o envio: a campanha vai para todos os contatos ativos, uma única vez para cada pessoa.</li>
        </ol>
        <p className="mt-3 text-xs">
          Atenção ao limite do seu plano no serviço de e-mail (Resend): no plano gratuito são 100 e-mails por dia. Se passar, o envio para e fica como &ldquo;parcial&rdquo;; no dia seguinte você
          envia só para quem faltou.
        </p>
      </div>

      {campaigns.length === 0 ? (
        <EmptyState
          icon="send"
          title="Nenhuma campanha ainda"
          description="Crie a primeira para avisar quem se inscreveu sobre um lançamento, uma promoção ou uma data especial."
          action={{ href: "/admin/clientes/campanhas/nova", label: "Nova campanha" }}
        />
      ) : (
        <div className="admin-card overflow-x-auto rounded-xl border border-mist">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist text-xs text-graphite">
                <th className="px-4 py-3 font-medium">Assunto</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="px-4 py-3 text-right font-medium">Enviados</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {campaigns.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-mist/40">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clientes/campanhas/${c.id}`} className="font-medium hover:text-petrol">
                      {c.subject}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge tone={STATUS[c.status]?.tone}>{STATUS[c.status]?.label ?? c.status}</StatusBadge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {c.delivered}
                    {c.failed ? <span className="ml-1 text-xs text-red-400">({c.failed} erro)</span> : null}
                  </td>
                  <td className="px-4 py-3 text-graphite">{formatStoreDate(c.sentAt ?? c.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
