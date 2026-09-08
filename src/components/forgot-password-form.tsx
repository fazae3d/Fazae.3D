"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { requestPasswordResetAction } from "@/app/(storefront)/esqueci-senha/actions";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation";
import { FormField } from "./form-field";

export function ForgotPasswordForm() {
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  const onSubmit = async (data: ForgotPasswordInput) => {
    const result = await requestPasswordResetAction(data);
    setResetLink(result.resetLink ?? null);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-graphite">
          Se esse e-mail tiver uma conta, enviaremos um link de redefinição de senha para ele.
        </p>
        {resetLink && (
          <div className="border border-paper/15 bg-mist p-4 text-sm">
            <p className="label-caps mb-2 text-[10px] text-graphite">
              Ambiente de demonstração: em produção este link seria enviado por e-mail
            </p>
            <Link href={resetLink} className="text-petrol hover:underline">
              Redefinir minha senha
            </Link>
          </div>
        )}
        <Link href="/login" className="text-center text-sm text-petrol hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <p className="text-sm text-graphite">
        Informe o e-mail da sua conta e enviaremos um link para redefinir sua senha.
      </p>
      <FormField
        id="email"
        label="E-mail"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register("email")}
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="label-caps bg-petrol py-4 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
      >
        {isSubmitting ? "Enviando..." : "Enviar link de recuperação"}
      </button>
      <Link href="/login" className="text-center text-sm text-petrol hover:underline">
        Voltar para o login
      </Link>
    </form>
  );
}
