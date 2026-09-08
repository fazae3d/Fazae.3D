"use client";

import { signOut } from "next-auth/react";

export function SignOutButton({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className={`label-caps text-xs text-graphite transition-colors hover:text-petrol ${className}`}
    >
      Sair
    </button>
  );
}
