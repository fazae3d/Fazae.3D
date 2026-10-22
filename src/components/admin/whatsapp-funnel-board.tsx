"use client";

import Link from "next/link";
import { useState } from "react";
import { updateLeadAction } from "@/app/admin/conversas/actions";
import { KanbanBoard } from "@/components/admin/kanban-board";
import { useToast } from "@/components/admin/toast";
import { LEAD_STAGES, formatPhone, sourceLabel } from "@/lib/whatsapp";
import type { WaConversationView } from "@/server/repositories/whatsapp-repository";

/** Funil em colunas: arraste o contato de uma etapa para outra. */
export function WhatsAppFunnelBoard({ conversations }: { conversations: WaConversationView[] }) {
  const { toast } = useToast();
  const [items, setItems] = useState(conversations);

  const move = async (id: string, stage: string) => {
    const before = items;
    setItems((list) => list.map((c) => (c.id === id ? { ...c, stage } : c)));
    const result = await updateLeadAction(id, { stage });
    if (!result.success) {
      setItems(before);
      toast(result.error, "error");
    }
  };

  return (
    <KanbanBoard
      columns={LEAD_STAGES.map((s) => ({ key: s.key, label: s.label }))}
      items={items}
      getItemId={(c) => c.id}
      getItemColumn={(c) => c.stage}
      onMove={(id, stage) => void move(id, stage)}
      renderCard={(c) => (
        <div className="space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">{c.name ?? formatPhone(c.phone)}</p>
            <Link
              href={`/admin/conversas?c=${c.id}`}
              onPointerDown={(e) => e.stopPropagation()}
              className="shrink-0 text-[11px] text-petrol hover:underline"
            >
              Abrir
            </Link>
          </div>
          {c.name ? <p className="text-graphite">{formatPhone(c.phone)}</p> : null}
          <p className="text-graphite">
            {sourceLabel(c.source)}
            {c.optedOut ? " · não quer receber" : ""}
          </p>
          {c.lastDirection === "in" && !c.optedOut ? <p className="font-medium text-amber-500">aguardando você</p> : null}
          {c.tags.length > 0 ? <p className="truncate text-graphite">{c.tags.slice(0, 3).join(" · ")}</p> : null}
        </div>
      )}
    />
  );
}
