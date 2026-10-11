import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  const value = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET não configurado.");
  return value;
}

function sign(body: string) {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/** Token assinado e com validade (e-mail + finalidade), sem guardar nada no banco: "<payload>.<assinatura>". */
export function createSignedToken(purpose: string, email: string, ttlMs: number | null): string {
  const payload = Buffer.from(JSON.stringify({ p: purpose, e: email.toLowerCase(), x: ttlMs ? Date.now() + ttlMs : null })).toString(
    "base64url",
  );
  return `${payload}.${sign(payload)}`;
}

export function readSignedToken(token: string, purpose: string): { email: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { p: string; e: string; x: number | null };
    if (data.p !== purpose) return null;
    if (data.x !== null && data.x < Date.now()) return null;
    return { email: data.e };
  } catch {
    return null;
  }
}
