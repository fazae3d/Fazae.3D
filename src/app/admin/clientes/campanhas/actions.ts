"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { ADMIN_AUTH_DISABLED } from "@/lib/dev-flags";
import { buildCampaignHtml, isSafeButtonUrl, type CampaignContent } from "@/lib/campaign-email";
import { sendEmail, sendEmailBatch } from "@/lib/email";
import { getEmailContactUrl } from "@/lib/email-template";
import { UNSUBSCRIBE_PURPOSE } from "@/lib/reminder-unsubscribe";
import { SITE_URL } from "@/lib/site-config";
import { logAdminAction } from "@/server/audit";
import {
  claimCampaignForSending,
  createCampaign,
  deleteCampaignDraft,
  finishCampaign,
  getActiveRecipients,
  getCampaign,
  getDeliveredEmails,
  recordDeliveries,
  updateCampaignDraft,
} from "@/server/repositories/campaign-repository";
import { upsertSubscriber } from "@/server/repositories/subscriber-repository";
import { createSignedToken } from "@/server/signed-token";

async function requireAdmin() {
  if (ADMIN_AUTH_DISABLED) return true;
  const session = await auth();
  return session?.user?.role === "admin";
}

const DENIED = { success: false, error: "Acesso restrito ao administrador." } as const;

const campaignSchema = z.object({
  subject: z.string().trim().min(3, "Escreva o assunto do e-mail.").max(150, "O assunto pode ter até 150 caracteres."),
  heading: z.string().trim().min(3, "Escreva o título que aparece dentro do e-mail.").max(120, "O título pode ter até 120 caracteres."),
  body: z.string().trim().min(10, "Escreva o texto do e-mail.").max(5000, "O texto pode ter até 5000 caracteres."),
  buttonLabel: z.string().trim().max(30, "O texto do botão pode ter até 30 caracteres.").optional(),
  buttonUrl: z.string().trim().optional(),
});

export type CampaignFormInput = z.input<typeof campaignSchema>;

function parseInput(input: CampaignFormInput): { ok: true; data: CampaignContent } | { ok: false; error: string } {
  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const { buttonLabel, buttonUrl, ...rest } = parsed.data;
  if ((buttonLabel && !buttonUrl) || (!buttonLabel && buttonUrl)) return { ok: false, error: "Para ter botão, preencha o texto e o endereço (link) dele." };
  if (buttonUrl && !isSafeButtonUrl(buttonUrl)) return { ok: false, error: "O endereço do botão precisa começar com https://" };
  return { ok: true, data: { ...rest, buttonLabel: buttonLabel || undefined, buttonUrl: buttonUrl || undefined } };
}

const unsubscribeUrlFor = (email: string) => `${SITE_URL}/cancelar-lembretes?token=${createSignedToken(UNSUBSCRIBE_PURPOSE, email, null)}`;

export async function previewCampaignAction(input: CampaignFormInput): Promise<{ html: string } | { error: string }> {
  if (!(await requireAdmin())) return { error: DENIED.error };
  const parsed = parseInput({ ...input, subject: input.subject || "Prévia", heading: input.heading || "Título do e-mail", body: input.body || "Texto do e-mail." });
  if (!parsed.ok) return { error: parsed.error };
  return {
    html: buildCampaignHtml({
      content: parsed.data,
      recipientName: "Maria",
      unsubscribeUrl: `${SITE_URL}/cancelar-lembretes`,
      contactUrl: await getEmailContactUrl(),
    }),
  };
}

type SaveResult = { success: true; id: string } | { success: false; error: string };

export async function saveCampaignAction(id: string | null, input: CampaignFormInput): Promise<SaveResult> {
  if (!(await requireAdmin())) return DENIED;
  const parsed = parseInput(input);
  if (!parsed.ok) return { success: false, error: parsed.error };
  try {
    if (id) {
      const ok = await updateCampaignDraft(id, parsed.data);
      if (!ok) return { success: false, error: "Essa campanha já foi enviada e não pode mais ser editada. Duplique para criar outra." };
      revalidatePath("/admin/clientes/campanhas");
      return { success: true, id };
    }
    const created = await createCampaign(parsed.data);
    await logAdminAction("campanha.criar", "Campaign", created.id, { subject: created.subject });
    revalidatePath("/admin/clientes/campanhas");
    return { success: true, id: created.id };
  } catch (error) {
    console.error("[campanha] falha ao salvar", error);
    return { success: false, error: "Não foi possível salvar agora. Tente de novo." };
  }
}

export async function deleteCampaignAction(id: string): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) return DENIED;
  const ok = await deleteCampaignDraft(id).catch(() => false);
  if (!ok) return { success: false, error: "Só é possível excluir campanhas que ainda são rascunho." };
  revalidatePath("/admin/clientes/campanhas");
  return { success: true };
}

/** Manda uma cópia só para você conferir antes de enviar a todos. */
export async function sendCampaignTestAction(input: CampaignFormInput, to: string): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const parsed = parseInput(input);
  if (!parsed.ok) return { success: false, error: parsed.error };
  if (!z.string().email().safeParse(to).success) return { success: false, error: "Informe um e-mail válido para receber o teste." };
  const result = await sendEmail({
    to,
    subject: `[TESTE] ${parsed.data.subject}`,
    html: buildCampaignHtml({
      content: parsed.data,
      recipientName: "Teste",
      unsubscribeUrl: unsubscribeUrlFor(to),
      contactUrl: await getEmailContactUrl(),
    }),
  });
  return result.success ? { success: true } : { success: false, error: result.error };
}

const BATCH_SIZE = 50;

export type SendCampaignResult =
  | { success: true; sent: number; failed: number; remaining: number; message: string }
  | { success: false; error: string };

/**
 * Envia a campanha para todos os contatos ativos que ainda não receberam. Cada pessoa recebe o seu e-mail (com o próprio
 * link de cancelamento). Se o serviço de e-mail recusar um lote (ex.: limite diário do plano), para e deixa a campanha como
 * "parcial": dá para continuar depois, só para quem faltou.
 */
export async function sendCampaignAction(id: string): Promise<SendCampaignResult> {
  if (!(await requireAdmin())) return DENIED;
  const campaign = await getCampaign(id).catch(() => undefined);
  if (!campaign) return { success: false, error: "Campanha não encontrada." };
  if (campaign.status === "enviada") return { success: false, error: "Essa campanha já foi enviada." };
  if (!(await claimCampaignForSending(id))) return { success: false, error: "Essa campanha já está sendo enviada." };

  try {
    const content: CampaignContent = {
      subject: campaign.subject,
      heading: campaign.heading,
      body: campaign.body,
      buttonLabel: campaign.buttonLabel,
      buttonUrl: campaign.buttonUrl,
    };
    const [recipients, already] = await Promise.all([getActiveRecipients(), getDeliveredEmails(id)]);
    const pending = recipients.filter((r) => !already.has(r.email));
    const contactUrl = await getEmailContactUrl();

    let sent = 0;
    let failed = 0;
    let stoppedError: string | null = null;
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const chunk = pending.slice(i, i + BATCH_SIZE);
      const result = await sendEmailBatch(
        chunk.map((r) => ({
          to: r.email,
          subject: content.subject,
          html: buildCampaignHtml({ content, recipientName: r.name, unsubscribeUrl: unsubscribeUrlFor(r.email), contactUrl }),
        })),
      );
      if (result.success) {
        sent += chunk.length;
        await recordDeliveries(id, chunk.map((r) => ({ email: r.email, status: "enviado" as const })));
      } else {
        failed += pending.length - i;
        stoppedError = result.error;
        await recordDeliveries(id, chunk.map((r) => ({ email: r.email, status: "erro" as const, error: result.error })));
        break;
      }
    }

    const remaining = Math.max(0, pending.length - sent);
    await finishCampaign(id, remaining === 0 ? "enviada" : "parcial");
    await logAdminAction("campanha.enviar", "Campaign", id, { subject: campaign.subject, sent, remaining });
    revalidatePath("/admin/clientes/campanhas");
    revalidatePath(`/admin/clientes/campanhas/${id}`);

    if (pending.length === 0) return { success: true, sent: 0, failed: 0, remaining: 0, message: "Não há contatos novos para receber esta campanha." };
    if (stoppedError) {
      return {
        success: true,
        sent,
        failed,
        remaining,
        message: `Enviamos ${sent} e-mail(s); o serviço de e-mail parou o envio: ${stoppedError} Quando liberar (ex.: no dia seguinte), use "Enviar para quem faltou".`,
      };
    }
    return { success: true, sent, failed, remaining, message: `Campanha enviada para ${sent} pessoa(s).` };
  } catch (error) {
    console.error("[campanha] falha no envio", error);
    await finishCampaign(id, "parcial").catch(() => undefined);
    return { success: false, error: "O envio foi interrompido por um erro. Veja o resultado e use \"Enviar para quem faltou\"." };
  }
}

const manualContactSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido."),
  name: z.string().trim().max(80).optional(),
  consent: z.literal(true, { message: "Confirme que a pessoa autorizou receber novidades." }),
});

/** Cadastro manual de quem pediu para receber novidades pessoalmente ou por WhatsApp (exige confirmar a autorização). */
export async function addContactAction(input: { email: string; name?: string; consent: boolean }): Promise<{ success: true } | { success: false; error: string }> {
  if (!(await requireAdmin())) return DENIED;
  const parsed = manualContactSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  try {
    await upsertSubscriber({ email: parsed.data.email, name: parsed.data.name || undefined, source: "painel" });
    revalidatePath("/admin/clientes/contatos");
    return { success: true };
  } catch (error) {
    console.error("[contatos] falha ao adicionar", error);
    return { success: false, error: "Não foi possível adicionar agora." };
  }
}
