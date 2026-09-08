import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { authConfig } from "./auth.config";
import { findOrCreateOAuthUserWithFallback, verifyPasswordWithFallback } from "@/server/user-auth-fallback";
import { ipFromRequest, rateLimit } from "@/server/rate-limit";
import { loginSchema } from "@/lib/validation";

const LOGIN_LIMIT = 20;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    // PLACEHOLDER credentials — create a Google Cloud OAuth client and set
    // AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET in .env.local before this works.
    // Until then, clicking "Continuar com Google" fails at Google's side,
    // it doesn't break the rest of auth.
    Google({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials, request) => {
        // Rate-limited before touching bcrypt: without this, /login is an
        // unthrottled password oracle (20 tries / 15 min / IP is generous
        // enough for a real user who fat-fingers a password twice).
        const ip = ipFromRequest(request);
        const limited = rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
        if (!limited.allowed) return null;

        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await verifyPasswordWithFallback(parsed.data.email, parsed.data.password);
        if (!user) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Google sign-in has no local account by default — provision (or
    // reuse) a DemoUser record here so an OAuth login gets the same order
    // history / saved addresses / role as a Credentials login. The
    // Credentials provider already resolved a real user in `authorize`,
    // so it's untouched here.
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const dbUser = await findOrCreateOAuthUserWithFallback({ name: user.name ?? user.email, email: user.email });
        user.id = dbUser.id;
        user.role = dbUser.role;
      }
      return true;
    },
  },
});
