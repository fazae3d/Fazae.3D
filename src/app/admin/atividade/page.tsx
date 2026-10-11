import { db } from "@/server/db";

const ACTION_LABELS: Record<string, string> = {
  "pedido.status": "Mudou o status do pedido",
  "pedido.excluir": "Excluiu o pedido",
  "produto.excluir": "Excluiu o produto",
};

export default async function AdminActivityPage() {
  const logs = await db.auditLog.findMany({ orderBy: { at: "desc" }, take: 200 });

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl">Atividade</h1>
      <p className="mt-1 mb-8 text-sm text-graphite">Registro das ações sensíveis feitas no painel (quem, o quê e quando). Últimas 200.</p>

      {logs.length === 0 ? (
        <div className="border border-mist px-6 py-16 text-center text-graphite">Nenhuma ação registrada ainda.</div>
      ) : (
        <ul className="divide-y divide-mist border border-mist">
          {logs.map((log) => (
            <li key={log.id} className="px-4 py-3 text-sm">
              <p>
                <span className="font-medium">{ACTION_LABELS[log.action] ?? log.action}</span>{" "}
                <span className="text-graphite">{log.targetId}</span>
              </p>
              <p className="text-xs text-graphite">
                {log.actorEmail} · {log.at.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" })}
                {log.details ? ` · ${JSON.stringify(log.details)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
