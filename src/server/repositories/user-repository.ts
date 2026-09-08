import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { db } from "../db";
import type { Address, DemoUser } from "../types";
import type { Prisma } from "@/generated/prisma/client";

export type { DemoUser };

type UserRow = Prisma.UserGetPayload<{ include: { addresses: true } }>;
type AddressRow = Prisma.AddressGetPayload<object>;

function toAddress(row: AddressRow): Address {
  return {
    id: row.id,
    label: row.label,
    recipient: row.recipient,
    cpf: row.cpf,
    street: row.street,
    number: row.number,
    complement: row.complement ?? undefined,
    neighborhood: row.neighborhood,
    city: row.city,
    state: row.state,
    zip: row.zip,
  };
}

function toDemoUser(row: UserRow): DemoUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    addresses: row.addresses.map(toAddress),
    resetToken: row.resetToken ?? undefined,
    resetTokenExpiresAt: row.resetTokenExpiresAt?.toISOString(),
  };
}

export async function findUserByEmail(email: string): Promise<DemoUser | undefined> {
  const row = await db.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: { addresses: true },
  });
  return row ? toDemoUser(row) : undefined;
}

export async function getAllUsers(): Promise<DemoUser[]> {
  const rows = await db.user.findMany({ include: { addresses: true } });
  return rows.map(toDemoUser);
}

export async function findUserById(id: string): Promise<DemoUser | undefined> {
  if (!id) return undefined;
  const row = await db.user.findUnique({ where: { id }, include: { addresses: true } });
  return row ? toDemoUser(row) : undefined;
}

export async function createUser({
  name,
  email,
  password,
}: {
  name: string;
  email: string;
  password: string;
}): Promise<DemoUser> {
  if (await findUserByEmail(email)) {
    throw new Error("Já existe uma conta com esse e-mail.");
  }
  const row = await db.user.create({
    data: { name, email, passwordHash: bcrypt.hashSync(password, 10), role: "customer" },
    include: { addresses: true },
  });
  return toDemoUser(row);
}

/**
 * First-time OAuth sign-in (Google, etc.) has no password to verify — this
 * provisions a DemoUser record on the fly so the account still gets order
 * history, saved addresses, and admin/customer role like any other user.
 * The random password hash is unusable — this account only ever signs in
 * through the OAuth provider.
 */
export async function findOrCreateOAuthUser({ name, email }: { name: string; email: string }): Promise<DemoUser> {
  const existing = await findUserByEmail(email);
  if (existing) return existing;

  const row = await db.user.create({
    data: { name, email, passwordHash: bcrypt.hashSync(randomUUID(), 10), role: "customer" },
    include: { addresses: true },
  });
  return toDemoUser(row);
}

export async function verifyPassword(email: string, password: string): Promise<DemoUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const valid = bcrypt.compareSync(password, user.passwordHash);
  return valid ? user : null;
}

export async function setPasswordResetToken(
  email: string,
  token: string,
  expiresAt: string,
): Promise<DemoUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const row = await db.user.update({
    where: { email: user.email },
    data: { resetToken: token, resetTokenExpiresAt: new Date(expiresAt) },
    include: { addresses: true },
  });
  return toDemoUser(row);
}

export async function findUserByResetToken(token: string): Promise<DemoUser | undefined> {
  const row = await db.user.findFirst({ where: { resetToken: token }, include: { addresses: true } });
  return row ? toDemoUser(row) : undefined;
}

export type ResetPasswordResult = { success: true } | { success: false; error: string };

export async function resetPasswordWithToken(token: string, newPassword: string): Promise<ResetPasswordResult> {
  const user = await findUserByResetToken(token);
  if (!user || !user.resetTokenExpiresAt || new Date(user.resetTokenExpiresAt) < new Date()) {
    return { success: false, error: "Link inválido ou expirado. Solicite uma nova recuperação de senha." };
  }
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: bcrypt.hashSync(newPassword, 10), resetToken: null, resetTokenExpiresAt: null },
  });
  return { success: true };
}

export type AddressMutationResult = { success: true; address: Address } | { success: false; error: string };

export async function addAddress(email: string, input: Omit<Address, "id">): Promise<AddressMutationResult> {
  const user = await findUserByEmail(email);
  if (!user) return { success: false, error: "Usuário não encontrado." };
  const row = await db.address.create({ data: { ...input, userId: user.id } });
  return { success: true, address: toAddress(row) };
}

export async function updateAddress(
  email: string,
  addressId: string,
  input: Omit<Address, "id">,
): Promise<AddressMutationResult> {
  const user = await findUserByEmail(email);
  if (!user) return { success: false, error: "Usuário não encontrado." };
  const existing = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (!existing) return { success: false, error: "Endereço não encontrado." };
  const row = await db.address.update({ where: { id: addressId }, data: input });
  return { success: true, address: toAddress(row) };
}

export type DeleteAddressResult = { success: true } | { success: false; error: string };

export async function removeAddress(email: string, addressId: string): Promise<DeleteAddressResult> {
  const user = await findUserByEmail(email);
  if (!user) return { success: false, error: "Usuário não encontrado." };
  const existing = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
  if (!existing) return { success: false, error: "Endereço não encontrado." };
  await db.address.delete({ where: { id: addressId } });
  return { success: true };
}
