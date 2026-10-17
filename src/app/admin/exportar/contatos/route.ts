import { isAdminRequest } from "@/lib/admin-guard";
import { csvResponse, toCsv } from "@/lib/csv";
import { storeDayKey } from "@/lib/store-time";
import { getAllSubscribers } from "@/server/repositories/subscriber-repository";

/** Contatos que aceitaram receber novidades (só os ativos), em CSV. */
export async function GET() {
  if (!(await isAdminRequest())) return new Response("Acesso restrito ao administrador.", { status: 403 });
  const subscribers = (await getAllSubscribers()).filter((s) => !s.unsubscribedAt);
  const rows = subscribers.map((s) => [s.email, s.name ?? "", s.whatsapp ?? "", s.source, s.createdAt.slice(0, 10)]);
  return csvResponse(`contatos-fazae-${storeDayKey(new Date())}.csv`, toCsv(["E-mail", "Nome", "WhatsApp", "Origem", "Inscrito em"], rows));
}
