import type { DefaultSession } from "next-auth";

type AppUserRole = "customer" | "admin";

declare module "next-auth" {
  interface User {
    role?: AppUserRole;
  }

  interface Session {
    user: {
      id: string;
      role: AppUserRole;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: AppUserRole;
    /** Quando o papel foi reconferido no banco (ms). */
    roleCheckedAt?: number;
  }
}
