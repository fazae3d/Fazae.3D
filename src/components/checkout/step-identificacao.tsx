"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField } from "../form-field";

const guestSchema = z.object({
  email: z.string().min(1, "Informe seu e-mail.").email("E-mail inválido."),
});
type GuestInput = z.infer<typeof guestSchema>;

export function StepIdentificacao({
  guestEmail,
  onNext,
}: {
  guestEmail: string | null;
  onNext: (guestEmail: string | null) => void;
}) {
  const { data: session, status } = useSession();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GuestInput>({
    resolver: zodResolver(guestSchema),
    defaultValues: { email: guestEmail ?? "" },
  });

  if (status === "loading") {
    return <div className="border border-paper/15 p-6 text-sm text-graphite">Carregando...</div>;
  }

  if (session?.user) {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <p className="label-caps mb-2 text-xs text-graphite">Identificação</p>
          <div className="border border-paper/15 p-6 text-sm">
            <p className="text-paper">{session.user.name}</p>
            <p className="mt-1 text-graphite">{session.user.email}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNext(null)}
          className="label-caps self-start bg-petrol px-8 py-4 text-xs text-ink transition-colors hover:bg-paper"
        >
          Continuar para endereço
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit((data) => onNext(data.email))} className="flex flex-col gap-6">
      <div>
        <p className="label-caps mb-2 text-xs text-graphite">Identificação</p>
        <p className="mb-4 text-sm text-graphite">
          Continue como convidado informando seu e-mail ou{" "}
          <Link href="/login?callbackUrl=%2Fcheckout" className="text-petrol hover:underline">
            entre na sua conta
          </Link>
          .
        </p>
        <FormField
          id="email"
          label="E-mail"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
      </div>
      <button
        type="submit"
        className="label-caps self-start bg-petrol px-8 py-4 text-xs text-ink transition-colors hover:bg-paper"
      >
        Continuar para endereço
      </button>
    </form>
  );
}
