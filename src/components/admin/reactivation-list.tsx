"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { markCustomerRemindedAction } from "@/app/admin/clientes/actions";
import { useToast } from "@/components/admin/toast";
import { StatusBadge } from "@/components/admin/page-header";
import { formatPrice } from "@/lib/format";
import { reactivationMessage } from "@/lib/customer-insights";

export type ReactivationRow = {
  id: string;
  name: string;
  phone: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
  daysSince: number;
  lastReminderAt?: string;
  /** Lembrado há pouco: fica escondido a não ser que o filtro "mostrar lembrados" esteja ligado. */
  recentlyReminded: boolean;
};

function whatsappDigits(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.length <= 11 ? `55${digits}` : digits;
}

const dateFmt = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" });

export function ReactivationList({ rows, siteUrl, days }: { rows: ReactivationRow[]; siteUrl: string; days: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [coupon, setCoupon] = useState("");
  const [showReminded, setShowReminded] = useState(false);

  const visible = rows.filter((r) => showReminded || !r.recentlyReminded);
  const hiddenCount = rows.length - rows.filter((r) => !r.recentlyReminded).length;

  const remind = (row: ReactivationRow) => {
    const message = reactivationMessage({ name: row.name, lastOrderAt: row.lastOrderAt, siteUrl, coupon });
    window.open(`https://wa.me/${whatsappDigits(row.phone)}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
    startTransition(async () => {
      const result = await markCustomerRemindedAction(row.id);
      if (!result.success) {
        toast(result.error, "error");
        return;
      }
      toast("Lembrete registrado");
      router.refresh();
    });
  };

  return (
    <div>
      <div className="admin-card mb-4 flex flex-wrap items-end gap-4 rounded-xl border border-mist p-4">
        <div className="min-w-[220px] flex-1">
          <label htmlFor="reativar-cupom" className="mb-1.5 block text-xs font-medium text-graphite">
            Cupom de volta (opcional)
          </label>
          <input
            id="reativar-cupom"
            value={coupon}
            onChange={(e) => setCoupon(e.target.value)}
            placeholder="Ex.: VOLTEI10 (crie o cupom em Catálogo → Cupons)"
            className="w-full rounded-lg border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={showReminded} onChange={(e) => setShowReminded(e.target.checked)} className="h-4 w-4 accent-ink" />
          Mostrar já lembrados{hiddenCount > 0 ? ` (${hiddenCount})` : ""}
        </label>
      </div>

      {visible.length === 0 ? (
        <div className="admin-card rounded-xl border border-mist px-6 py-16 text-center">
          <p className="font-medium">Ninguém para reativar agora</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-graphite">
            Clientes que já compraram e ficam {days} dias sem voltar aparecem aqui. Quem você lembrou some da lista por 30 dias.
          </p>
        </div>
      ) : (
        <ul className="admin-card divide-y divide-mist rounded-xl border border-mist">
          {visible.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <Link href={`/admin/clientes/${row.id}`} className="font-medium hover:text-petrol">
                  {row.name || "(sem nome)"}
                </Link>
                <p className="text-xs text-graphite">
                  {row.phone} · última compra em {dateFmt(row.lastOrderAt)} ({row.daysSince} dias) · {row.orderCount} compra(s) · {formatPrice(row.totalSpent)}
                </p>
                {row.lastReminderAt ? (
                  <p className="mt-1">
                    <StatusBadge tone="info">Lembrado em {dateFmt(row.lastReminderAt)}</StatusBadge>
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => remind(row)}
                disabled={pending}
                className="shrink-0 rounded-lg bg-petrol px-3.5 py-2 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {row.lastReminderAt ? "Lembrar de novo" : "Lembrar no WhatsApp"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
