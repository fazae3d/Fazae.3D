import type { Metadata } from "next";
import { auth } from "@/auth";
import { AddressBook } from "@/components/address-book";
import { Breadcrumb } from "@/components/breadcrumb";
import { findUserByEmail } from "@/server/repositories/user-repository";
import { withReadFallback } from "@/lib/db-fallback";

export const metadata: Metadata = {
  title: "Meus endereços",
};

export default async function EnderecosPage() {
  const session = await auth();
  // TODO(fase DB): remove o fallback quando a Fazaê tiver o próprio banco — hoje a leitura real falharia sem Supabase configurado.
  const user = session?.user?.email
    ? await withReadFallback(() => findUserByEmail(session.user!.email!), undefined)
    : undefined;

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumb
        items={[
          { label: "Início", href: "/" },
          { label: "Minha conta", href: "/conta" },
          { label: "Meus endereços" },
        ]}
      />
      <h1 className="font-display mb-10 text-3xl sm:text-4xl">Meus endereços</h1>
      <AddressBook initialAddresses={user?.addresses ?? []} />
    </div>
  );
}
