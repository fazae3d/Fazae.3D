import { db } from "../db";

export type CampaignRecord = {
  id: string;
  subject: string;
  heading: string;
  body: string;
  buttonLabel?: string;
  buttonUrl?: string;
  status: "rascunho" | "enviando" | "parcial" | "enviada";
  createdAt: string;
  sentAt?: string;
  delivered: number;
  failed: number;
};

type Row = {
  id: string;
  subject: string;
  heading: string;
  body: string;
  buttonLabel: string | null;
  buttonUrl: string | null;
  status: string;
  createdAt: Date;
  sentAt: Date | null;
  deliveries?: { status: string }[];
};

function toRecord(row: Row): CampaignRecord {
  const deliveries = row.deliveries ?? [];
  return {
    id: row.id,
    subject: row.subject,
    heading: row.heading,
    body: row.body,
    buttonLabel: row.buttonLabel ?? undefined,
    buttonUrl: row.buttonUrl ?? undefined,
    status: row.status as CampaignRecord["status"],
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString(),
    delivered: deliveries.filter((d) => d.status === "enviado").length,
    failed: deliveries.filter((d) => d.status === "erro").length,
  };
}

export async function getAllCampaigns(): Promise<CampaignRecord[]> {
  const rows = await db.campaign.findMany({ orderBy: { createdAt: "desc" }, include: { deliveries: { select: { status: true } } } });
  return rows.map(toRecord);
}

export async function getCampaign(id: string): Promise<CampaignRecord | undefined> {
  const row = await db.campaign.findUnique({ where: { id }, include: { deliveries: { select: { status: true } } } });
  return row ? toRecord(row) : undefined;
}

export type CampaignInput = { subject: string; heading: string; body: string; buttonLabel?: string; buttonUrl?: string };

export async function createCampaign(input: CampaignInput): Promise<CampaignRecord> {
  return toRecord(await db.campaign.create({ data: input }));
}

export async function updateCampaignDraft(id: string, input: CampaignInput): Promise<boolean> {
  const result = await db.campaign.updateMany({
    where: { id, status: "rascunho" },
    data: { ...input, buttonLabel: input.buttonLabel ?? null, buttonUrl: input.buttonUrl ?? null },
  });
  return result.count > 0;
}

export async function deleteCampaignDraft(id: string): Promise<boolean> {
  const result = await db.campaign.deleteMany({ where: { id, status: "rascunho" } });
  return result.count > 0;
}

/** Trava o envio: só quem muda de "rascunho"/"parcial" para "enviando" segue (evita dois cliques disparando em dobro). */
export async function claimCampaignForSending(id: string): Promise<boolean> {
  const result = await db.campaign.updateMany({ where: { id, status: { in: ["rascunho", "parcial"] } }, data: { status: "enviando" } });
  return result.count > 0;
}

export async function finishCampaign(id: string, status: "enviada" | "parcial"): Promise<void> {
  await db.campaign.update({ where: { id }, data: { status, sentAt: status === "enviada" ? new Date() : undefined } });
}

export async function getDeliveredEmails(campaignId: string): Promise<Set<string>> {
  const rows = await db.campaignDelivery.findMany({ where: { campaignId, status: "enviado" }, select: { email: true } });
  return new Set(rows.map((r) => r.email));
}

export async function recordDeliveries(campaignId: string, entries: { email: string; status: "enviado" | "erro"; error?: string }[]): Promise<void> {
  for (const entry of entries) {
    await db.campaignDelivery.upsert({
      where: { campaignId_email: { campaignId, email: entry.email } },
      create: { campaignId, email: entry.email, status: entry.status, error: entry.error },
      update: { status: entry.status, error: entry.error ?? null },
    });
  }
}

/** Contatos ativos (aceitaram receber e não cancelaram) que também não pediram para parar nos lembretes. */
export async function getActiveRecipients(): Promise<{ email: string; name?: string }[]> {
  const [subscribers, optOuts] = await Promise.all([
    db.subscriber.findMany({ where: { unsubscribedAt: null }, select: { email: true, name: true }, orderBy: { createdAt: "asc" } }),
    db.emailOptOut.findMany({ select: { email: true } }),
  ]);
  const blocked = new Set(optOuts.map((o) => o.email.toLowerCase()));
  return subscribers.filter((s) => !blocked.has(s.email.toLowerCase())).map((s) => ({ email: s.email, name: s.name ?? undefined }));
}
