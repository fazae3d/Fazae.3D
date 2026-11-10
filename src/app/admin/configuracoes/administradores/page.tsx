import { auth } from "@/auth";
import { AdminManager } from "@/components/admin/admin-manager";
import { PageHeader } from "@/components/admin/page-header";
import { withReadFallback } from "@/lib/db-fallback";
import { listAdmins } from "@/server/repositories/admin-repository";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administradores" };

export default async function AdministratorsPage() {
  const [session, admins] = await Promise.all([auth(), withReadFallback(() => listAdmins(), [])]);
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Administradores"
        description="Quem pode entrar neste painel. Quem for adicionado aqui acessa tudo: pedidos, finanças, clientes e WhatsApp. Adicionar e remover fica registrado em Atividade."
      />
      <AdminManager admins={admins} selfEmail={session?.user?.email ?? ""} />
    </div>
  );
}
