import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "../db";

export type AdminView = {
  id: string;
  name: string;
  email: string;
  /** A pessoa já entrou (Google ou e-mail confirmado). Enquanto não, o acesso está liberado mas ainda não foi usado. */
  verified: boolean;
  createdAt: string;
};

export async function listAdmins(): Promise<AdminView[]> {
  const rows = await db.user.findMany({ where: { role: "admin" }, orderBy: { createdAt: "asc" }, select: { id: true, name: true, email: true, emailVerifiedAt: true, createdAt: true } });
  return rows.map((r) => ({ id: r.id, name: r.name, email: r.email, verified: r.emailVerifiedAt !== null, createdAt: r.createdAt.toISOString() }));
}

export type AdminChangeResult = { success: true; created: boolean } | { success: false; error: string };

/**
 * Dá acesso de administrador a um e-mail. Se a conta já existe, só muda o papel; se não existe, cria uma conta sem senha utilizável
 * (a pessoa entra com o Google ou pelo "esqueci minha senha", que provam que o e-mail é dela).
 * Conta existente que nunca confirmou o e-mail perde a senha antiga: quem a criou pode não ser o dono desse e-mail.
 */
export async function addAdmin(email: string, name?: string): Promise<AdminChangeResult> {
  const clean = email.trim().toLowerCase();
  const existing = await db.user.findFirst({ where: { email: { equals: clean, mode: "insensitive" } } });
  if (existing) {
    if (existing.role === "admin") return { success: false, error: "Essa pessoa já é administradora." };
    await db.user.update({
      where: { id: existing.id },
      data: { role: "admin", ...(existing.emailVerifiedAt ? {} : { passwordHash: bcrypt.hashSync(randomUUID(), 10) }) },
    });
    return { success: true, created: false };
  }
  await db.user.create({
    data: {
      name: name?.trim() || clean.split("@")[0],
      email: clean,
      passwordHash: bcrypt.hashSync(randomUUID(), 10),
      role: "admin",
    },
  });
  return { success: true, created: true };
}

/** Tira o acesso de administrador (a conta de cliente continua existindo). Nunca deixa a loja sem administrador. */
export async function removeAdmin(id: string): Promise<{ success: true; email: string } | { success: false; error: string }> {
  const target = await db.user.findUnique({ where: { id }, select: { id: true, email: true, role: true } });
  if (!target || target.role !== "admin") return { success: false, error: "Essa pessoa não é administradora." };
  const admins = await db.user.count({ where: { role: "admin" } });
  if (admins <= 1) return { success: false, error: "A loja precisa de pelo menos um administrador." };
  await db.user.update({ where: { id }, data: { role: "customer" } });
  return { success: true, email: target.email };
}
