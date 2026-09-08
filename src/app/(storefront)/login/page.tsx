import type { Metadata } from "next";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Entrar",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const callbackUrl = typeof params.callbackUrl === "string" ? params.callbackUrl : "/conta";

  return (
    <div className="mx-auto flex max-w-md flex-col px-4 py-20 sm:px-6">
      <p className="label-caps text-xs text-petrol">Minha conta</p>
      <h1 className="font-display mt-2 mb-10 text-3xl">Entrar</h1>
      <LoginForm callbackUrl={callbackUrl} />
    </div>
  );
}
