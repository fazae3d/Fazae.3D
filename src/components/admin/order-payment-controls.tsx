"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/admin/toast";
import { setOrderPaymentAction } from "@/app/admin/pedidos/actions";
import { formatPrice } from "@/lib/format";
import { round2 } from "@/lib/money";
import { parseMoneyInput as parseMoney } from "@/lib/payment";

const moneyText = (value: number) => String(round2(value)).replace(".", ",");

/**
 * Pagamento de uma venda lançada no painel: mostra quanto já entrou, permite registrar um pagamento (inteiro ou parcial, ex.: 50% para
 * começar a produzir e 50% na entrega) e corrigir/desfazer o valor recebido.
 */
export function OrderPaymentControls({ id, total, received }: { id: string; total: number; received: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [mode, setMode] = useState<null | "add" | "set">(null);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = round2(Math.max(0, total - received));
  const paid = remaining === 0;

  const open = (next: "add" | "set") => {
    setError(null);
    setInput(next === "add" ? moneyText(remaining) : moneyText(received));
    setMode(next);
  };

  const submit = async (override?: { mode: "add" | "set"; amount: number }) => {
    const m = override?.mode ?? mode!;
    const amount = override?.amount ?? parseMoney(input);
    if (m === "add" && amount <= 0) {
      setError("Informe quanto você recebeu.");
      return;
    }
    if (m === "add" && amount > remaining + 0.004) {
      setError(`Esse valor passa do que falta (${formatPrice(remaining)}).`);
      return;
    }
    if (m === "set" && amount > total + 0.004) {
      setError(`O total recebido não pode passar de ${formatPrice(total)}.`);
      return;
    }
    setError(null);
    setPending(true);
    const result = await setOrderPaymentAction(id, m, amount);
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    setMode(null);
    toast(result.paid ? "Pedido pago por completo" : result.received > 0 ? `Recebido ${formatPrice(result.received)} de ${formatPrice(result.total)}` : "Pagamento desfeito");
    router.refresh();
  };

  return (
    <div className="mt-2 text-xs">
      <p className="text-graphite">
        Recebido <strong className="text-ink">{formatPrice(received)}</strong> de {formatPrice(total)}
        {paid ? "" : ` · falta ${formatPrice(remaining)}`}
      </p>
      <div className="mt-1 h-1 w-full max-w-[220px] rounded-full bg-mist">
        <div className="h-1 rounded-full bg-petrol" style={{ width: `${total > 0 ? Math.min(100, (received / total) * 100) : 0}%` }} />
      </div>

      {mode ? (
        <div className="mt-2 rounded-lg border border-mist p-2.5">
          <label className="mb-1 block text-graphite">{mode === "add" ? "Quanto você recebeu agora (R$)" : "Total recebido até agora (R$)"}</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              inputMode="decimal"
              className="w-28 rounded-lg border border-mist bg-transparent px-2.5 py-1.5 text-sm outline-none focus:border-petrol"
              aria-label="Valor"
            />
            <button type="button" onClick={() => submit()} disabled={pending} className="rounded-lg bg-petrol px-3 py-1.5 font-semibold disabled:opacity-60">
              {pending ? "Salvando…" : "Confirmar"}
            </button>
            <button type="button" onClick={() => setMode(null)} disabled={pending} className="text-graphite hover:text-ink">
              Cancelar
            </button>
          </div>
          {mode === "add" && remaining > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-3 text-graphite">
              <button type="button" onClick={() => setInput(moneyText(remaining))} className="hover:text-petrol hover:underline">
                Tudo que falta ({formatPrice(remaining)})
              </button>
              {remaining >= total / 2 && total > 0 ? (
                <button type="button" onClick={() => setInput(moneyText(total / 2))} className="hover:text-petrol hover:underline">
                  50% ({formatPrice(total / 2)})
                </button>
              ) : null}
            </div>
          ) : null}
          {error ? <p className="mt-1.5 text-red-500">{error}</p> : null}
        </div>
      ) : (
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {!paid && (
            <button type="button" onClick={() => open("add")} className="font-medium text-petrol hover:underline">
              Registrar pagamento
            </button>
          )}
          {received > 0 && (
            <button type="button" onClick={() => open("set")} className="text-graphite hover:text-ink hover:underline">
              Corrigir valor
            </button>
          )}
          {received > 0 && (
            <button type="button" onClick={() => submit({ mode: "set", amount: 0 })} disabled={pending} className="text-graphite hover:text-red-400 hover:underline disabled:opacity-60">
              Desfazer pagamento
            </button>
          )}
        </div>
      )}
      {!mode && error ? <p className="mt-1 text-red-500">{error}</p> : null}
    </div>
  );
}
