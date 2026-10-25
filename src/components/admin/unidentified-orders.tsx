"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { identifyOrdersAction } from "@/app/admin/clientes/actions";
import { Select } from "@/components/select";
import { formatPrice } from "@/lib/format";
import { CUSTOMER_SOURCES } from "@/lib/customer-source";
import { normalizePhone } from "@/lib/whatsapp";

export type UnidentifiedGroup = {
  key: string;
  name: string;
  orderIds: string[];
  total: number;
  lastAt: string;
  /** Telefone de um cliente cadastrado com este mesmo nome (sugestão). */
  suggestedPhone?: string;
};

const INPUT = "w-full rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol";

function Row({ group }: { group: UnidentifiedGroup }) {
  const router = useRouter();
  const [name, setName] = useState(group.name);
  const [phone, setPhone] = useState(group.suggestedPhone ?? "");
  const [source, setSource] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = normalizePhone(phone) !== null;

  const save = async () => {
    setPending(true);
    setError(null);
    const result = await identifyOrdersAction({ orderIds: group.orderIds, name, phone, source: source || undefined });
    setPending(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    router.refresh();
  };

  return (
    <li className="px-4 py-4 text-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {group.name || "(sem nome)"}{" "}
          <span className="font-normal text-graphite">
            · {group.orderIds.length} pedido(s) · {formatPrice(group.total)} · último em {new Date(group.lastAt).toLocaleDateString("pt-BR", { timeZone: "America/Fortaleza" })}
          </span>
        </p>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-start">
        <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Nome do cliente" placeholder="Nome" className={INPUT} />
        <div>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            aria-label="Telefone"
            placeholder="(84) 99999-8888"
            className={`${INPUT} ${phone.trim() && !valid ? "border-red-500" : ""}`}
          />
          {group.suggestedPhone ? <p className="mt-1 text-[11px] text-graphite">Telefone de um cliente já cadastrado com este nome.</p> : null}
        </div>
        <Select
          value={source}
          onChange={setSource}
          className={INPUT}
          placeholder="Como nos conheceu"
          options={[{ value: "", label: "Como nos conheceu (opcional)" }, ...CUSTOMER_SOURCES]}
        />
        <button
          type="button"
          onClick={save}
          disabled={pending || !valid || !name.trim()}
          className="rounded-lg bg-petrol px-4 py-2 text-sm font-semibold text-[#111] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Salvando…" : "Identificar"}
        </button>
      </div>
      {error ? <p className="mt-2 text-xs text-red-500">{error}</p> : null}
    </li>
  );
}

export function UnidentifiedOrders({ groups }: { groups: UnidentifiedGroup[] }) {
  return (
    <ul className="admin-card divide-y divide-mist rounded-xl border border-mist">
      {groups.map((group) => (
        <Row key={group.key} group={group} />
      ))}
    </ul>
  );
}
