// TEMPORARY diagnostic route — reports only presence/length of env vars,
// never their actual values. Delete this file once the Vercel env var
// investigation is done.
export async function GET() {
  const check = (name: string) => {
    const value = process.env[name];
    return { present: Boolean(value), length: value?.length ?? 0 };
  };

  return Response.json({
    AUTH_GOOGLE_ID: check("AUTH_GOOGLE_ID"),
    AUTH_GOOGLE_SECRET: check("AUTH_GOOGLE_SECRET"),
    RESEND_API_KEY: check("RESEND_API_KEY"),
    RESEND_FROM_EMAIL: check("RESEND_FROM_EMAIL"),
    STORE_CONTACT_EMAIL: check("STORE_CONTACT_EMAIL"),
    AUTH_SECRET: check("AUTH_SECRET"),
    DATABASE_URL: check("DATABASE_URL"),
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
  });
}
