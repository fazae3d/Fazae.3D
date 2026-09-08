import type { NextAuthConfig, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

/**
 * Edge-safe subset of the NextAuth config — no providers here, since the
 * Credentials provider's `authorize` callback pulls in bcrypt + Prisma
 * (Node-only APIs the Edge Runtime that middleware runs in can't load).
 * Reading an already-issued JWT session doesn't need any provider, so
 * middleware builds its own NextAuth instance from just this config
 * instead of importing the full one from auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    // NextAuth v5's inferred callback-parameter types don't reliably pick
    // up the module augmentation in src/types/next-auth.d.ts (a known
    // rough edge — the SDK's own intersection type for these params
    // resolves custom fields to `unknown` instead of the augmented type).
    // Annotating the params explicitly sidesteps that inference and gets
    // the real Session/JWT shape, including `role`.
    async jwt({ token, user }: { token: JWT; user?: { id?: string; role?: "customer" | "admin" } | null }) {
      if (user) {
        if (user.id) token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      session.user.id = token.id as string;
      session.user.role = token.role ?? "customer";
      return session;
    },
  },
} satisfies NextAuthConfig;
