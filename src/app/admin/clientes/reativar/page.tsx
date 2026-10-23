import { PageHeader } from "@/components/admin/page-header";
import { ReactivationList, type ReactivationRow } from "@/components/admin/reactivation-list";
import { daysSince, isInactive, wasRecentlyReminded } from "@/lib/customer-insights";
import { withReadFallback } from "@/lib/db-fallback";
import { SITE_URL } from "@/lib/site-config";
import { getStoreRules } from "@/server/store-rules";
import { getCustomersWithMetrics } from "@/server/repositories/customer-repository";

export const metadata = { title: "Clientes para reativar" };

export default async function ReactivationPage() {
  const [customers, rules] = await Promise.all([withReadFallback(() => getCustomersWithMetrics(), []), getStoreRules()]);
  const { reactivationDays, reminderCooldownDays } = rules.automation;
  const now = new Date();

  // Os mais valiosos primeiro: vale mais a pena chamar quem já gastou mais.
  const rows: ReactivationRow[] = customers
    .filter((c) => c.phone && isInactive(c.metrics, now, reactivationDays))
    .sort((a, b) => b.metrics.totalSpent - a.metrics.totalSpent)
    .map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      orderCount: c.metrics.orderCount,
      totalSpent: c.metrics.totalSpent,
      lastOrderAt: c.metrics.lastOrderAt!,
      daysSince: daysSince(c.metrics.lastOrderAt!, now),
      lastReminderAt: c.lastReminderAt,
      recentlyReminded: wasRecentlyReminded(c.lastReminderAt, now, reminderCooldownDays),
    }));

  const pending = rows.filter((r) => !r.recentlyReminded).length;

  return (
    <div>
      <PageHeader
        title="Clientes para reativar"
        description={`Quem já comprou e não volta há ${reactivationDays} dias ou mais: ${pending} para chamar agora, ${rows.length} no total. O botão abre o WhatsApp com a mensagem pronta e registra o lembrete.`}
      />
      <ReactivationList rows={rows} siteUrl={SITE_URL} days={reactivationDays} />
    </div>
  );
}
