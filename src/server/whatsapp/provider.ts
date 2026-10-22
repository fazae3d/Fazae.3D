import { randomBytes } from "crypto";

export type SendResult = { ok: true; providerId: string } | { ok: false; error: string };

export type MediaKind = "image" | "document" | "video" | "audio";

export interface WhatsAppProvider {
  /** "uazapi" quando há credenciais; "simulador" quando não: nada sai de verdade e dá para testar todo o painel. */
  readonly name: "uazapi" | "simulador";
  sendText(phone: string, text: string, options?: { delayMs?: number }): Promise<SendResult>;
  /** Envia um arquivo a partir de um endereço público (ex.: o PDF do orçamento). */
  sendMedia(phone: string, media: { url: string; kind: MediaKind; caption?: string; fileName?: string }): Promise<SendResult>;
  /** O número tem WhatsApp? `null` = não foi possível saber (não bloqueia o envio). */
  checkNumber(phone: string): Promise<boolean | null>;
  /** `known: false` quando a resposta não deu para interpretar: nesse caso não se deve bloquear nada por causa disso. */
  connectionStatus(): Promise<{ connected: boolean; known: boolean; detail?: string }>;
}

const simulator: WhatsAppProvider = {
  name: "simulador",
  async sendText() {
    return { ok: true, providerId: `sim-${randomBytes(8).toString("hex")}` };
  },
  async sendMedia() {
    return { ok: true, providerId: `sim-${randomBytes(8).toString("hex")}` };
  },
  async checkNumber() {
    return true;
  },
  async connectionStatus() {
    return { connected: false, known: false, detail: "Modo simulação: nenhuma mensagem é enviada de verdade." };
  },
};

function uazapi(baseUrl: string, token: string): WhatsAppProvider {
  const base = baseUrl.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", token };

  /** Envio com o mesmo cuidado dos dois tipos: timeout não prova que falhou, então nunca reenviamos sozinhos. */
  async function post(path: string, body: Record<string, unknown>): Promise<SendResult> {
    try {
      const res = await fetch(`${base}${path}`, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
      const data = (await res.json().catch(() => ({}))) as { messageid?: string; id?: string; error?: string };
      if (!res.ok) return { ok: false, error: data.error ?? `O WhatsApp recusou o envio (HTTP ${res.status}).` };
      const providerId = data.messageid ?? data.id;
      if (!providerId) return { ok: false, error: "O envio foi aceito mas sem identificador; confira no WhatsApp antes de reenviar." };
      return { ok: true, providerId };
    } catch (error) {
      const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
      return { ok: false, error: timedOut ? "Sem resposta do WhatsApp: confira no aparelho antes de reenviar." : "Não foi possível falar com o servidor do WhatsApp." };
    }
  }

  return {
    name: "uazapi",
    sendText: (phone, text, options) => post("/send/text", { number: phone, text, ...(options?.delayMs ? { delay: options.delayMs } : {}) }),
    sendMedia: (phone, media) =>
      post("/send/media", {
        number: phone,
        type: media.kind,
        file: media.url,
        ...(media.caption ? { text: media.caption } : {}),
        ...(media.kind === "document" && media.fileName ? { docName: media.fileName } : {}),
      }),
    async checkNumber(phone) {
      try {
        const res = await fetch(`${base}/chat/check`, { method: "POST", headers, body: JSON.stringify({ numbers: [phone] }), signal: AbortSignal.timeout(10_000) });
        if (!res.ok) return null;
        const data = (await res.json().catch(() => null)) as { isInWhatsapp?: boolean; error?: string }[] | null;
        const first = Array.isArray(data) ? data[0] : null;
        if (!first || first.error) return null;
        return typeof first.isInWhatsapp === "boolean" ? first.isInWhatsapp : null;
      } catch {
        return null;
      }
    },
    async connectionStatus() {
      try {
        const res = await fetch(`${base}/instance/status`, { headers, signal: AbortSignal.timeout(5_000), cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as { status?: unknown; instance?: { status?: string } };
        const status = typeof data.status === "string" ? data.status : data.instance?.status;
        const flag = typeof data.status === "object" && data.status !== null ? (data.status as { connected?: boolean }).connected : undefined;
        const known = res.ok && (typeof status === "string" || typeof flag === "boolean");
        return { connected: res.ok && (status === "connected" || flag === true), known, detail: status ? `Estado: ${status}` : undefined };
      } catch {
        return { connected: false, known: false, detail: "Servidor do WhatsApp não respondeu." };
      }
    },
  };
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const url = process.env.UAZAPI_URL;
  const token = process.env.UAZAPI_TOKEN;
  return url && token ? uazapi(url, token) : simulator;
}
