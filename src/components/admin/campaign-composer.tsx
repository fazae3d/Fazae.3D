"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/admin/toast";
import {
  deleteCampaignAction,
  previewCampaignAction,
  saveCampaignAction,
  sendCampaignAction,
  sendCampaignTestAction,
} from "@/app/admin/clientes/campanhas/actions";

const INPUT = "w-full rounded-lg border border-mist bg-transparent px-3 py-2 text-sm outline-none focus:border-petrol";
const LABEL = "mb-1.5 block text-xs font-medium text-graphite";

type Status = "rascunho" | "enviando" | "parcial" | "enviada";

export function CampaignComposer({
  campaignId,
  initial,
  status,
  recipientsCount,
  alreadyDelivered,
  failed,
  adminEmail,
}: {
  campaignId: string | null;
  initial: { subject: string; heading: string; body: string; buttonLabel: string; buttonUrl: string };
  status: Status;
  /** Contatos ativos que ainda vão receber (já descontados os que receberam). */
  recipientsCount: number;
  alreadyDelivered: number;
  failed: number;
  adminEmail: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [subject, setSubject] = useState(initial.subject);
  const [heading, setHeading] = useState(initial.heading);
  const [body, setBody] = useState(initial.body);
  const [buttonLabel, setButtonLabel] = useState(initial.buttonLabel);
  const [buttonUrl, setButtonUrl] = useState(initial.buttonUrl);
  const [testTo, setTestTo] = useState(adminEmail);
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | "save" | "test" | "send" | "delete">(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const locked = status !== "rascunho";
  const input = { subject, heading, body, buttonLabel, buttonUrl };
  const latest = useRef(input);
  latest.current = input;

  // Prévia ao vivo: atualiza meio segundo depois de parar de digitar.
  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await previewCampaignAction(latest.current);
      if ("html" in res) {
        setPreviewHtml(res.html);
        setPreviewError(null);
      } else {
        setPreviewError(res.error);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [subject, heading, body, buttonLabel, buttonUrl]);

  const save = async () => {
    setError(null);
    setBusy("save");
    const res = await saveCampaignAction(campaignId, input);
    setBusy(null);
    if (!res.success) {
      setError(res.error);
      toast(res.error, "error");
      return null;
    }
    toast("Rascunho salvo");
    if (!campaignId) router.replace(`/admin/clientes/campanhas/${res.id}`);
    else router.refresh();
    return res.id;
  };

  const sendTest = async () => {
    setError(null);
    setBusy("test");
    const res = await sendCampaignTestAction(input, testTo);
    setBusy(null);
    if (!res.success) {
      setError(res.error);
      toast(res.error, "error");
      return;
    }
    toast(`Teste enviado para ${testTo}`);
  };

  const sendAll = async () => {
    setError(null);
    setBusy("send");
    // Salva a versão atual antes de enviar, para ir exatamente o que está na tela.
    const id = campaignId && status === "rascunho" ? (await save()) : campaignId ?? (await save());
    if (!id) {
      setBusy(null);
      return;
    }
    const res = await sendCampaignAction(id);
    setBusy(null);
    setConfirmSend(false);
    if (!res.success) {
      setError(res.error);
      toast(res.error, "error");
      return;
    }
    setResult(res.message);
    toast(res.message, res.remaining > 0 ? "error" : "success");
    router.push(`/admin/clientes/campanhas/${id}`);
    router.refresh();
  };

  const remove = async () => {
    if (!campaignId) return;
    setBusy("delete");
    const res = await deleteCampaignAction(campaignId);
    setBusy(null);
    if (!res.success) {
      toast(res.error ?? "Não foi possível excluir.", "error");
      return;
    }
    toast("Rascunho excluído");
    router.push("/admin/clientes/campanhas");
  };

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-5">
        {locked ? (
          <div className="admin-card rounded-xl border border-mist p-4 text-sm">
            {status === "enviada" ? (
              <p>
                Campanha <strong>enviada</strong>: {alreadyDelivered} e-mail(s) entregues ao serviço de envio{failed ? `, ${failed} com erro` : ""}. Ela não pode mais ser editada; crie uma nova
                campanha para a próxima.
              </p>
            ) : status === "enviando" ? (
              <p>Envio em andamento… atualize a página em instantes.</p>
            ) : (
              <p>
                Envio <strong>parcial</strong>: {alreadyDelivered} enviado(s), {recipientsCount} ainda faltam. Quando o limite do serviço de e-mail liberar (ex.: no dia seguinte), clique em
                &ldquo;Enviar para quem faltou&rdquo;.
              </p>
            )}
          </div>
        ) : null}

        <div>
          <label className={LABEL}>Assunto do e-mail *</label>
          <input className={INPUT} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={locked} placeholder="Ex.: Chegaram peças novas na Fazaê" maxLength={150} />
          <p className="mt-1 text-xs text-graphite">É o que aparece na caixa de entrada. Curto e claro funciona melhor.</p>
        </div>
        <div>
          <label className={LABEL}>Título dentro do e-mail *</label>
          <input className={INPUT} value={heading} onChange={(e) => setHeading(e.target.value)} disabled={locked} placeholder="Ex.: Novidades da semana" maxLength={120} />
        </div>
        <div>
          <label className={LABEL}>Texto *</label>
          <textarea
            className={`${INPUT} min-h-[200px]`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={locked}
            maxLength={5000}
            placeholder={"Escreva o texto do e-mail.\n\nUma linha em branco separa os parágrafos.\n\n- Linhas começando com hífen viram lista\n- Assim, ó"}
          />
          <p className="mt-1 text-xs text-graphite">Linha em branco = novo parágrafo. Linhas começando com &ldquo;- &rdquo; viram uma lista.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={LABEL}>Texto do botão (opcional)</label>
            <input className={INPUT} value={buttonLabel} onChange={(e) => setButtonLabel(e.target.value)} disabled={locked} placeholder="Ver novidades" maxLength={30} />
          </div>
          <div>
            <label className={LABEL}>Link do botão (opcional)</label>
            <input className={INPUT} value={buttonUrl} onChange={(e) => setButtonUrl(e.target.value)} disabled={locked} placeholder="https://www.fazae3d.com.br/loja" inputMode="url" />
          </div>
        </div>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}
        {result ? <p className="text-sm text-graphite">{result}</p> : null}

        {!locked && (
          <div className="admin-card rounded-xl border border-mist p-4">
            <label className={LABEL}>Enviar um teste só para mim</label>
            <div className="flex flex-wrap gap-2">
              <input className={`${INPUT} min-w-[220px] flex-1`} value={testTo} onChange={(e) => setTestTo(e.target.value)} inputMode="email" />
              <button type="button" onClick={sendTest} disabled={busy !== null} className="rounded-lg border border-mist px-4 py-2 text-sm transition-colors hover:border-petrol disabled:opacity-60">
                {busy === "test" ? "Enviando…" : "Enviar teste"}
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          {!locked && (
            <button type="button" onClick={save} disabled={busy !== null} className="rounded-lg border border-mist px-5 py-2.5 text-sm transition-colors hover:border-petrol disabled:opacity-60">
              {busy === "save" ? "Salvando…" : "Salvar rascunho"}
            </button>
          )}

          {status !== "enviada" && status !== "enviando" && (
            confirmSend ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-petrol/50 bg-petrol/10 px-3 py-2 text-sm">
                <span>
                  Enviar agora para <strong>{recipientsCount} pessoa(s)</strong>? Não dá para desfazer.
                </span>
                <button type="button" onClick={sendAll} disabled={busy !== null} className="rounded-lg bg-petrol px-4 py-1.5 font-semibold disabled:opacity-60">
                  {busy === "send" ? "Enviando…" : "Sim, enviar"}
                </button>
                <button type="button" onClick={() => setConfirmSend(false)} disabled={busy === "send"} className="text-graphite hover:text-ink">
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmSend(true)}
                disabled={busy !== null || recipientsCount === 0}
                title={recipientsCount === 0 ? "Não há contatos ativos para receber" : undefined}
                className="rounded-lg bg-petrol px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {status === "parcial" ? `Enviar para quem faltou (${recipientsCount})` : `Enviar para ${recipientsCount} pessoa(s)`}
              </button>
            )
          )}

          {campaignId && status === "rascunho" && (
            <button type="button" onClick={remove} disabled={busy !== null} className="ml-auto text-sm text-graphite hover:text-red-400">
              Excluir rascunho
            </button>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <p className="mb-2 text-xs font-medium text-graphite">Como vai chegar ao cliente</p>
        {previewError ? (
          <p className="admin-card rounded-xl border border-mist p-4 text-sm text-graphite">{previewError}</p>
        ) : (
          <iframe title="Prévia do e-mail" srcDoc={previewHtml} sandbox="" className="h-[640px] w-full rounded-xl border border-mist bg-white" />
        )}
      </div>
    </div>
  );
}
