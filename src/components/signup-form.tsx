"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signupAction } from "@/app/(storefront)/cadastro/actions";
import { FormField } from "./form-field";
import { GoogleIcon } from "./google-icon";
import { signupSchema, type SignupInput } from "@/lib/validation";

export function SignupForm({ callbackUrl, defaultEmail }: { callbackUrl: string; defaultEmail?: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: defaultEmail ?? "" },
  });

  const onSubmit = async (data: SignupInput) => {
    setFormError(null);
    const result = await signupAction(data);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    const signInResult = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });
    if (signInResult?.error) {
      setFormError("Conta criada, mas não foi possível entrar automaticamente. Faça login.");
      return;
    }
    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <FormField
        id="name"
        label="Nome completo"
        autoComplete="name"
        error={errors.name?.message}
        {...register("name")}
      />
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
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <FormField
        id="confirmPassword"
        label="Confirmar senha"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {formError && <p className="text-xs text-red-600">{formError}</p>}
      <button
        type="submit"
        disabled={isSubmitting}
        className="label-caps bg-petrol py-4 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
      >
        {isSubmitting ? "Criando conta..." : "Criar conta"}
      </button>

      <div className="flex items-center gap-3 text-xs text-graphite">
        <span className="h-px flex-1 bg-paper/15" />
        ou
        <span className="h-px flex-1 bg-paper/15" />
      </div>
      <button
        type="button"
        onClick={() => signIn("google", { callbackUrl })}
        className="label-caps flex items-center justify-center gap-2.5 border border-paper/15 py-4 text-xs text-paper transition-colors hover:border-petrol"
      >
        <GoogleIcon />
        Continuar com Google
      </button>

      <p className="text-center text-sm text-graphite">
        Já tem conta?{" "}
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="text-petrol hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
