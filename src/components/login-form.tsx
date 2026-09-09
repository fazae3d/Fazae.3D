"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormField } from "./form-field";
import { GoogleIcon } from "./google-icon";
import { loginSchema, type LoginInput } from "@/lib/validation";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setFormError(null);
    // signIn() can reject outright (network hiccup, etc.) instead of resolving
    // with { error } — without this catch, a failed login left the form
    // showing nothing at all instead of a message.
    try {
      const result = await signIn("credentials", { ...data, redirect: false });
      if (result?.error) {
        setFormError("E-mail ou senha incorretos.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setFormError("Não foi possível entrar agora. Tente novamente.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <FormField
        id="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <FormField
        id="password"
        label="Senha"
        type="password"
        autoComplete="current-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <Link href="/esqueci-senha" className="-mt-2 self-end text-xs text-petrol hover:underline">
        Esqueci minha senha
      </Link>
      {formError && <p className="text-xs text-red-600">{formError}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="label-caps rounded-full bg-petrol py-4 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
      >
        {isSubmitting ? "Entrando..." : "Entrar"}
      </button>

      <div className="flex items-center gap-3 text-xs text-graphite">
        <span className="h-px flex-1 bg-paper/15" />
        ou
        <span className="h-px flex-1 bg-paper/15" />
      </div>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className="label-caps flex items-center justify-center gap-2.5 rounded-full border border-paper/15 py-4 text-xs text-paper transition-colors hover:border-petrol"
      >
        <GoogleIcon />
        Continuar com Google
      </button>

      <p className="text-center text-sm text-graphite">
        Ainda não tem conta?{" "}
        <Link href={`/cadastro?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-petrol hover:underline">
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
