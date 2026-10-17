import { db } from "../db";

export type SubscriberRecord = {
  id: string;
  email: string;
  name?: string;
  whatsapp?: string;
  source: string;
  createdAt: string;
  unsubscribedAt?: string;
};

export async function upsertSubscriber(input: { email: string; name?: string; whatsapp?: string; source: string }): Promise<{ created: boolean }> {
  const email = input.email.trim().toLowerCase();
  const existing = await db.subscriber.findUnique({ where: { email } });
  if (existing) {
    // Quem já tinha cancelado e se inscreve de novo está dando um novo consentimento: volta para a lista.
    await db.subscriber.update({
      where: { email },
      data: { unsubscribedAt: null, name: input.name ?? existing.name, whatsapp: input.whatsapp ?? existing.whatsapp },
    });
    return { created: false };
  }
  await db.subscriber.create({ data: { email, name: input.name, whatsapp: input.whatsapp, source: input.source } });
  return { created: true };
}

export async function getAllSubscribers(): Promise<SubscriberRecord[]> {
  const rows = await db.subscriber.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map((r) => ({
    id: r.id,
    email: r.email,
    name: r.name ?? undefined,
    whatsapp: r.whatsapp ?? undefined,
    source: r.source,
    createdAt: r.createdAt.toISOString(),
    unsubscribedAt: r.unsubscribedAt?.toISOString(),
  }));
}
