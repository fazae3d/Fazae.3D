import type { Metadata } from "next";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = {
  title: "Cadastro",
};

export default async function CadastroPage({ searchParams }: PageProps<"/cadastro">) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : "/conta";
  const defaultEmail = typeof params.email === "string" ? params.email : undefined;

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20 sm:px-6">
      <p className="label-caps text-xs text-petrol">Minha conta</p>
      <h1 className="font-display mt-2 mb-10 text-3xl">Criar conta</h1>
      <SignupForm callbackUrl={callbackUrl} defaultEmail={defaultEmail} />
    </div>
  );
}
