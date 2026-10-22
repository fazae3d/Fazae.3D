import { db } from "../db";
import { slugifyShortcut } from "@/lib/whatsapp";

export type QuickReplyView = { id: string; title: string; shortcut: string; body: string };

export async function listQuickReplies(): Promise<QuickReplyView[]> {
  const rows = await db.waQuickReply.findMany({ orderBy: { title: "asc" } });
  return rows.map((r) => ({ id: r.id, title: r.title, shortcut: r.shortcut, body: r.body }));
}

export type QuickReplyInput = { title: string; shortcut?: string; body: string };

export async function saveQuickReply(id: string | null, input: QuickReplyInput): Promise<{ success: true; id: string } | { success: false; error: string }> {
  const title = input.title.trim();
  const body = input.body.trim();
  const shortcut = slugifyShortcut(input.shortcut?.trim() ? input.shortcut : title);
  if (title.length < 2 || title.length > 60) return { success: false, error: "Dê um título para a resposta (até 60 letras)." };
  if (shortcut.length < 2) return { success: false, error: "O atalho precisa ter pelo menos 2 letras ou números." };
  if (!body) return { success: false, error: "Escreva a mensagem." };
  if (body.length > 2000) return { success: false, error: "A mensagem passa de 2.000 caracteres." };

  const clash = await db.waQuickReply.findUnique({ where: { shortcut }, select: { id: true } });
  if (clash && clash.id !== id) return { success: false, error: `O atalho /${shortcut} já está em uso por outra resposta.` };

  if (id) {
    await db.waQuickReply.update({ where: { id }, data: { title, shortcut, body } });
    return { success: true, id };
  }
  const created = await db.waQuickReply.create({ data: { title, shortcut, body } });
  return { success: true, id: created.id };
}

export async function deleteQuickReply(id: string): Promise<void> {
  await db.waQuickReply.delete({ where: { id } });
}
