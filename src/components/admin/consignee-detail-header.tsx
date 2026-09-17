"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ConsigneeForm } from "./consignee-form";
import { deleteConsigneeAction, updateConsigneeAction } from "@/app/admin/consignacao/actions";
import { formatDocument } from "@/lib/cpf";
import type { Consignee } from "@/server/types";

function addressLine(c: Consignee) {
  const parts = [c.street && c.number ? `${c.street}, ${c.number}` : c.street, c.neighborhood, c.city && c.state ? `${c.city}/${c.state}` : c.city, c.zip]
    .filter(Boolean);
  return parts.length > 0 ? parts.join(" — ") : "Endereço não informado";
}

export function ConsigneeDetailHeader({ consignee }: { consignee: Consignee }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    const result = await deleteConsigneeAction(consignee.id);
    if (!result.success) {
      setDeleteError(result.error);
      setDeleting(false);
      setConfirmingDelete(false);
      return;
    }
    router.push("/admin/consignacao");
  };

  if (editing) {
    return (
      <div className="border border-mist p-5">
        <p className="label-caps mb-4 text-xs text-graphite">Editar lojista</p>
        <ConsigneeForm
          action={(input) => updateConsigneeAction(consignee.id, input)}
          defaultValues={consignee}
          submitLabel="Salvar alterações"
          onSuccess={() => {
            setEditing(false);
            router.refresh();
          }}
        />
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="label-caps mt-3 text-[11px] text-graphite hover:text-petrol"
        >
          Cancelar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border border-mist p-5">
      <div>
        <h1 className="font-display text-2xl sm:text-3xl">{consignee.name}</h1>
        <p className="mt-1 text-sm text-graphite">{formatDocument(consignee.document)} · {consignee.phone}</p>
        {consignee.email && <p className="text-sm text-graphite">{consignee.email}</p>}
        <p className="mt-1 text-sm text-graphite">{addressLine(consignee)}</p>
        {consignee.notes && <p className="mt-2 text-sm text-graphite">{consignee.notes}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="label-caps text-[11px] text-graphite hover:text-petrol"
        >
          Editar
        </button>
        {confirmingDelete ? (
          <span className="flex items-center gap-2 text-[11px]">
            <span className="text-graphite">Excluir?</span>
            <button
              disabled={deleting}
              onClick={handleDelete}
              className="label-caps text-red-600 hover:underline disabled:opacity-60"
            >
              Sim
            </button>
            <button onClick={() => setConfirmingDelete(false)} className="label-caps text-graphite hover:underline">
              Não
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="label-caps text-[11px] text-graphite hover:text-red-600"
          >
            Excluir
          </button>
        )}
      </div>
      {deleteError && <p className="w-full text-xs text-red-600">{deleteError}</p>}
    </div>
  );
}
