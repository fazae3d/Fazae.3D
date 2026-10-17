import Link from "next/link";
import { AddContactForm } from "@/components/admin/add-contact-form";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader, StatusBadge } from "@/components/admin/page-header";
import { withReadFallback } from "@/lib/db-fallback";
import { formatStoreDate } from "@/lib/quote";
import { getAllSubscribers } from "@/server/repositories/subscriber-repository";

export const metadata = { title: "Contatos de novidades" };

const SOURCE_LABELS: Record<string, string> = { rodape: "Rodapé da loja", home: "Página inicial", checkout: "Checkout", painel: "Adicionado no painel" };

export default async function ContactsPage() {
  const subscribers = await withReadFallback(() => getAllSubscribers(), []);
  const active = subscribers.filter((s) => !s.unsubscribedAt);

  return (
    <div>
      <PageHeader
        title="Contatos de novidades"
        description={`${active.length} pessoa(s) aceitaram receber novidades e ofertas (rodapé da loja e caixa do checkout). Só envie para quem está nesta lista.`}
        actions={
          <>
            <a href="/admin/exportar/contatos" className="rounded-lg border border-mist px-3.5 py-2 text-sm text-graphite transition-colors hover:border-petrol hover:text-ink">
              Exportar CSV
            </a>
            <Link href="/admin/clientes/campanhas/nova" className="rounded-lg bg-petrol px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90">
              Enviar novidades
            </Link>
          </>
        }
      />
      <AddContactForm />
      {subscribers.length === 0 ? (
        <EmptyState
          icon="clients"
          title="Nenhum contato ainda"
          description="Quando alguém se inscrever no rodapé da loja ou marcar a caixa de novidades no checkout, aparece aqui, com data e origem do consentimento."
        />
      ) : (
        <div className="admin-card overflow-x-auto rounded-xl border border-mist">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-mist text-xs text-graphite">
                <th className="px-4 py-3 font-medium">E-mail</th>
                <th className="px-4 py-3 font-medium">Origem</th>
                <th className="px-4 py-3 font-medium">Inscrito em</th>
                <th className="px-4 py-3 font-medium">Situação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-mist">
              {subscribers.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">{s.email}</td>
                  <td className="px-4 py-3 text-graphite">{SOURCE_LABELS[s.source] ?? s.source}</td>
                  <td className="px-4 py-3 text-graphite">{formatStoreDate(s.createdAt)}</td>
                  <td className="px-4 py-3">{s.unsubscribedAt ? <StatusBadge tone="warning">Cancelou</StatusBadge> : <StatusBadge tone="success">Ativo</StatusBadge>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
