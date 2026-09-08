"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteCouponAction } from "@/app/admin/cupons/actions";

export function DeleteCouponButton({ code }: { code: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (confirming) {
    return (
      <span className="flex items-center gap-2 text-[11px]">
        <span className="text-graphite">Excluir?</span>
        <button
          disabled={pending}
          onClick={async () => {
            setPending(true);
            const result = await deleteCouponAction(code);
            if (!result.success) {
              setError(result.error);
              setPending(false);
              setConfirming(false);
              return;
            }
            router.refresh();
          }}
          className="label-caps text-red-600 hover:underline disabled:opacity-60"
        >
          Sim
        </button>
        <button onClick={() => setConfirming(false)} className="label-caps text-graphite hover:underline">
          Não
        </button>
      </span>
    );
  }

  return (
    <>
      <button
        onClick={() => setConfirming(true)}
        className="label-caps text-[11px] text-graphite hover:text-red-600"
      >
        Excluir
      </button>
      {error && <p className="mt-1 text-[11px] text-red-600">{error}</p>}
    </>
  );
}
