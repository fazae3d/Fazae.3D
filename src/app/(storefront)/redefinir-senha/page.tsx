import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/reset-password-form";

export const metadata: Metadata = {
  title: "Redefinir senha",
  robots: { index: false, follow: false },
};

export default async function RedefinirSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20 sm:px-6">
      <p className="label-caps text-xs text-petrol">Minha conta</p>
      <h1 className="font-display mt-2 mb-10 text-3xl">Redefinir senha</h1>
      <ResetPasswordForm token={token} />
    </div>
  );
}
