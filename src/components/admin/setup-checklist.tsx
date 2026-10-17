import Link from "next/link";
import { AdminIcon } from "./admin-icons";

export type SetupItem = { key: string; label: string; hint: string; done: boolean; href?: string };

/** Lista do que ainda falta configurar na loja. Some sozinha quando tudo estiver pronto. */
export function SetupChecklist({ items }: { items: SetupItem[] }) {
  const pending = items.filter((i) => !i.done);
  if (pending.length === 0) return null;
  const doneCount = items.length - pending.length;

  return (
    <section className="admin-card mb-6 rounded-xl border border-mist p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Falta configurar ({pending.length})</h2>
        <span className="text-xs text-graphite">
          {doneCount} de {items.length} prontos
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full rounded-full bg-mist">
        <div className="h-1.5 rounded-full bg-petrol" style={{ width: `${(doneCount / items.length) * 100}%` }} />
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-3 text-sm">
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                item.done ? "border-petrol bg-petrol text-[#111]" : "border-mist text-transparent"
              }`}
            >
              <AdminIcon name="check" className="h-3 w-3" />
            </span>
            <span className="min-w-0">
              {item.href && !item.done ? (
                <Link href={item.href} className="font-medium hover:text-petrol">
                  {item.label}
                </Link>
              ) : (
                <span className={item.done ? "text-graphite line-through" : "font-medium"}>{item.label}</span>
              )}
              {!item.done ? <span className="block text-xs text-graphite">{item.hint}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
