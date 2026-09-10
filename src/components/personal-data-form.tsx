"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { updateProfileAction } from "@/app/(storefront)/conta/actions";
import { FormField } from "./form-field";
import { profileSchema, type ProfileInput } from "@/lib/validation";

export function PersonalDataForm({ name, email }: { name: string; email: string }) {
  const { update } = useSession();
  const [editing, setEditing] = useState(false);
  const [currentName, setCurrentName] = useState(name);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileInput>({ resolver: zodResolver(profileSchema), defaultValues: { name: currentName } });

  const onSubmit = async (data: ProfileInput) => {
    setFormError(null);
    const result = await updateProfileAction(data);
    if (!result.success) {
      setFormError(result.error);
      return;
    }
    setCurrentName(result.name);
    setEditing(false);
    // Keeps the header avatar/initial and any other session-derived display
    // in sync — the JWT still has the old name until the token itself
    // refreshes, which this triggers explicitly.
    await update({ name: result.name });
  };

  if (editing) {
    return (
      <form onSubmit={handleSubmit(onSubmit)} className="border border-paper/15 p-6 text-sm">
        <FormField id="name" label="Nome completo" error={errors.name?.message} {...register("name")} />
        {formError && <p className="mt-2 text-xs text-red-600">{formError}</p>}
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="label-caps rounded-full border border-paper/15 px-5 py-2.5 text-[11px] text-graphite transition-colors hover:border-petrol hover:text-petrol"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="label-caps rounded-full bg-petrol px-5 py-2.5 text-[11px] text-ink transition-colors hover:bg-paper disabled:opacity-60"
          >
            {isSubmitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="border border-paper/15 p-6 text-sm">
      <p className="text-paper">{currentName}</p>
      <p className="mt-1 text-graphite">{email}</p>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="label-caps mt-3 text-[11px] text-petrol hover:underline"
      >
        Editar
      </button>
    </div>
  );
}
