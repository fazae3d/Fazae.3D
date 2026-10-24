"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setInstallmentPaidAction } from "@/app/admin/financas/actions";

/**
 * Marca uma parcela futura como paga (o dinheiro sai do caixa hoje) ou desfaz a marcação. Parcela que já venceu conta como paga
 * sozinha, então o botão só aparece nas que ainda não venceram ou nas que foram marcadas antes.
 */
export function InstallmentPayButton({ expenseId, number, paid }: { expenseId: string; number: number; paid: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = async () => {
    setPending(true);
    setError(null);
    const result = await setInstallmentPaidAction(expenseId, number, !paid);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" onClick={toggle} disabled={pending} className="label-caps text-[11px] text-petrol hover:underline disabled:opacity-60">
        {pending ? "Salvando..." : paid ? "Desfazer" : "Marcar como paga hoje"}
      </button>
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
    </span>
  );
}
