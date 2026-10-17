import Link from "next/link";
import type { ReactNode } from "react";
import { AdminIcon, type AdminIconName } from "./admin-icons";

/** Tela vazia com convite para agir (em vez de só "nenhum registro"). */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: AdminIconName;
  title: string;
  description?: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div className="admin-card flex flex-col items-center rounded-xl border border-dashed border-mist px-6 py-14 text-center">
      <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-petrol/15 text-petrol">
        <AdminIcon name={icon} className="h-6 w-6" />
      </span>
      <p className="font-medium">{title}</p>
      {description ? <p className="mx-auto mt-1 max-w-sm text-sm text-graphite">{description}</p> : null}
      {action ? (
        <Link href={action.href} className="mt-5 rounded-lg bg-petrol px-4 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90">
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
