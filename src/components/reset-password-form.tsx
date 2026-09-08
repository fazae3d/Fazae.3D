"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordAction } from "@/app/(storefront)/esqueci-senha/actions";
import { resetPasswordSchema, type ResetPasswordInput } from "@/lib/validation";
import { FormField } from "./form-field";

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });

  const onSubmit = async (data: ResetPasswordInput) => {
    setFormError(null);
    const result = await resetPasswordAction(token, data);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    setDone(true);
  };

  if (!token) {
    return <p className="text-sm text-red-600">Link inválido. Solicite uma nova recuperação de senha.</p>;
  }

  if (done) {
    return (
      <div className="flex flex-col gap-5">
        <p className="text-sm text-petrol">Senha redefinida com sucesso.</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="label-caps bg-petrol py-4 text-xs text-ink transition-colors hover:bg-paper"
        >
          Ir para o login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <FormField
        id="password"
        label="Nova senha"
        type="password"
        autoComplete="new-password"
        error={errors.password?.message}
        {...register("password")}
      />
      <FormField
        id="confirmPassword"
        label="Confirmar nova senha"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />
      {formError && (
        <div className="text-xs text-red-600">
          {formError}{" "}
          <Link href="/esqueci-senha" className="underline">
            Solicitar novo link
          </Link>
        </div>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="label-caps bg-petrol py-4 text-xs text-ink transition-colors hover:bg-paper disabled:opacity-60"
      >
        {isSubmitting ? "Salvando..." : "Redefinir senha"}
      </button>
    </form>
  );
}
