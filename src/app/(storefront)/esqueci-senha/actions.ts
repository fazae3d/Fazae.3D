"use server";

import { randomUUID } from "crypto";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation";
import {
  findUserByEmail,
  resetPasswordWithToken,
  setPasswordResetToken,
  type ResetPasswordResult,
} from "@/server/repositories/user-repository";
import { getClientIp, rateLimit } from "@/server/rate-limit";
import { sendEmail } from "@/lib/email";
import { SITE_URL } from "@/lib/site-config";

const RESET_REQUEST_LIMIT = 5;
const RESET_REQUEST_WINDOW_MS = 15 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export type RequestResetResult = { success: true; resetLink?: string };

/**
 * Always returns success (never reveals whether the e-mail has an
 * account — standard practice to avoid enumeration). `resetLink` is only
 * returned in the response when no e-mail provider is configured, so the
 * dev/demo flow keeps working without RESEND_API_KEY set; once a real
 * provider is configured the link is e-mailed instead and withheld here.
 */
export async function requestPasswordResetAction(input: unknown): Promise<RequestResetResult> {
  const ip = await getClientIp();
  const limited = rateLimit(`reset-request:${ip}`, RESET_REQUEST_LIMIT, RESET_REQUEST_WINDOW_MS);
  if (!limited.allowed) return { success: true };

  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { success: true };

  const user = await findUserByEmail(parsed.data.email);
  if (!user) return { success: true };

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();
  await setPasswordResetToken(user.email, token, expiresAt);

  const resetPath = `/redefinir-senha?token=${token}`;
  const emailResult = await sendEmail({
    to: user.email,
    subject: "Fazaê: redefinição de senha",
    html: `<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${SITE_URL}${resetPath}">Clique aqui para criar uma nova senha</a></p><p>Se você não pediu isso, ignore este e-mail.</p>`,
  });

  return { success: true, resetLink: emailResult.success ? undefined : resetPath };
}

export async function resetPasswordAction(token: string, input: unknown): Promise<ResetPasswordResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  if (!token) {
    return { success: false, error: "Link inválido ou expirado." };
  }
  return resetPasswordWithToken(token, parsed.data.password);
}
