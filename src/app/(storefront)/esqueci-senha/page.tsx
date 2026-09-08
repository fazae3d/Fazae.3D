import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export const metadata: Metadata = {
  title: "Esqueci minha senha",
  robots: { index: false, follow: false },
};

export default function EsqueciSenhaPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20 sm:px-6">
      <p className="label-caps text-xs text-petrol">Minha conta</p>
      <h1 className="font-display mt-2 mb-10 text-3xl">Esqueci minha senha</h1>
      <ForgotPasswordForm />
    </div>
  );
}
