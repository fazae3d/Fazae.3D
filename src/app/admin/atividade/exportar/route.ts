import { NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/admin-guard";
import { describeChange, entryTitle, modelLabel } from "@/lib/audit-format";
import { csvResponse, toCsv } from "@/lib/csv";
import { listAuditForExport } from "@/server/repositories/audit-repository";

/** Atividade do painel em planilha (com os mesmos filtros da tela). */
export async function GET(request: NextRequest) {
  if (!(await isAdminRequest())) return new Response("Acesso restrito ao administrador.", { status: 403 });
  const p = request.nextUrl.searchParams;
  const entries = await listAuditForExport({ q: p.get("q") ?? undefined, quem: p.get("quem") ?? undefined, tipo: p.get("tipo") ?? undefined, area: p.get("area") ?? undefined, de: p.get("de") ?? undefined, ate: p.get("ate") ?? undefined });
  const rows = entries.map((e) => [
    new Date(e.at).toLocaleString("pt-BR", { timeZone: "America/Fortaleza" }),
    e.actorEmail,
    entryTitle(e),
    modelLabel(e.targetType),
    e.targetId,
    e.kind === "event" ? JSON.stringify(e.details ?? {}) : e.changes.map(describeChange).join(" | "),
    e.restoredAt ? `Desfeito por ${e.restoredBy}` : "",
  ]);
  return csvResponse("atividade.csv", toCsv(["Quando", "Quem", "O que fez", "Área", "Item", "O que mudou", "Situação"], rows));
}
