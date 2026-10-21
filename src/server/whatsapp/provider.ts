import { randomBytes } from "crypto";

export type SendResult = { ok: true; providerId: string } | { ok: false; error: string };

export interface WhatsAppProvider {
  /** "uazapi" quando há credenciais; "simulador" quando não: nada sai de verdade e dá para testar todo o painel. */
  readonly name: "uazapi" | "simulador";
  sendText(phone: string, text: string, options?: { delayMs?: number }): Promise<SendResult>;
  connectionStatus(): Promise<{ connected: boolean; detail?: string }>;
}

const simulator: WhatsAppProvider = {
  name: "simulador",
  async sendText() {
    return { ok: true, providerId: `sim-${randomBytes(8).toString("hex")}` };
  },
  async connectionStatus() {
    return { connected: false, detail: "Modo simulação: nenhuma mensagem é enviada de verdade." };
  },
};

function uazapi(baseUrl: string, token: string): WhatsAppProvider {
  const base = baseUrl.replace(/\/+$/, "");
  const headers = { "Content-Type": "application/json", token };
  return {
    name: "uazapi",
    async sendText(phone, text, options) {
      try {
        const res = await fetch(`${base}/send/text`, {
          method: "POST",
          headers,
          body: JSON.stringify({ number: phone, text, ...(options?.delayMs ? { delay: options.delayMs } : {}) }),
          signal: AbortSignal.timeout(20_000),
        });
        const data = (await res.json().catch(() => ({}))) as { messageid?: string; id?: string; error?: string };
        if (!res.ok) return { ok: false, error: data.error ?? `O WhatsApp recusou o envio (HTTP ${res.status}).` };
        const providerId = data.messageid ?? data.id;
        if (!providerId) return { ok: false, error: "O envio foi aceito mas sem identificador; confira no WhatsApp antes de reenviar." };
        return { ok: true, providerId };
      } catch (error) {
        // Timeout não prova que falhou: a mensagem pode ter saído. Por isso nunca reenviamos sozinhos.
        const timedOut = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError");
        return { ok: false, error: timedOut ? "Sem resposta do WhatsApp: confira no aparelho antes de reenviar." : "Não foi possível falar com o servidor do WhatsApp." };
      }
    },
    async connectionStatus() {
      try {
        const res = await fetch(`${base}/instance/status`, { headers, signal: AbortSignal.timeout(5_000), cache: "no-store" });
        const data = (await res.json().catch(() => ({}))) as {
          status?: unknown;
          instance?: { status?: string };
        };
        const status = typeof data.status === "string" ? data.status : data.instance?.status;
        const connectedFlag = typeof data.status === "object" && data.status !== null && (data.status as { connected?: boolean }).connected === true;
        return { connected: res.ok && (status === "connected" || connectedFlag), detail: status ? `Estado: ${status}` : undefined };
      } catch {
        return { connected: false, detail: "Servidor do WhatsApp não respondeu." };
      }
    },
  };
}

export function getWhatsAppProvider(): WhatsAppProvider {
  const url = process.env.UAZAPI_URL;
  const token = process.env.UAZAPI_TOKEN;
  return url && token ? uazapi(url, token) : simulator;
}
