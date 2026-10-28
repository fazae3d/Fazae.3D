import { CopyTextButton } from "@/components/copy-text-button";
import { formatPrice } from "@/lib/format";
import type { QuotePix } from "@/lib/pix";

/** Pix do orçamento na página pública: QR code, valor, chave e "copia e cola". */
export function QuotePixCard({ pix, qr, notice, receiver, proofHref }: { pix: QuotePix; qr: string; notice?: string; receiver: string; proofHref?: string }) {
  const hasAmount = pix.amount > 0;
  const full = pix.pct >= 100;

  return (
    <section className="mt-8 border border-petrol/40 p-5 sm:p-6" aria-labelledby="pix-title">
      <h2 id="pix-title" className="font-display text-xl">
        Pague pelo Pix
      </h2>
      <p className="mt-1 text-sm text-graphite">
        {hasAmount
          ? full
            ? "Aponte a câmera do app do seu banco para o QR code. O valor total já vem preenchido."
            : `Aponte a câmera do app do seu banco para o QR code. Ele já vem com o sinal de ${pix.pct}% do orçamento.`
          : "Aponte a câmera do app do seu banco para o QR code e digite o valor combinado com a gente."}
      </p>

      <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* O QR é uma imagem gerada na hora (data URL): next/image não ajuda aqui. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qr} alt="QR code do Pix" width={200} height={200} className="h-[200px] w-[200px] shrink-0 rounded-lg bg-white p-1" />
        <div className="min-w-0 flex-1 space-y-3 text-sm">
          {hasAmount ? (
            <div>
              <p className="label-caps text-[11px] text-graphite">{full ? "Valor total" : `Sinal de ${pix.pct}%`}</p>
              <p className="font-display text-3xl text-petrol">{formatPrice(pix.amount)}</p>
              {!full && pix.remaining > 0 ? <p className="text-xs text-graphite">Restante de {formatPrice(pix.remaining)} antes do envio ou da retirada.</p> : null}
            </div>
          ) : (
            <div>
              <p className="label-caps text-[11px] text-graphite">Valor</p>
              <p className="text-graphite">Você digita no app. Total do orçamento: {formatPrice(pix.total)}.</p>
            </div>
          )}
          <div>
            <p className="label-caps text-[11px] text-graphite">Chave Pix</p>
            <p className="break-all font-medium">{pix.key}</p>
            <CopyTextButton text={pix.key} label="Copiar chave" className="label-caps mt-1.5 rounded-full border border-petrol px-4 py-1.5 text-[11px] text-petrol transition-colors hover:bg-petrol hover:text-[#111]" />
          </div>
          <div>
            <p className="label-caps text-[11px] text-graphite">Pix copia e cola</p>
            <p className="max-h-20 overflow-hidden break-all rounded bg-mist/40 p-2 font-mono text-[11px] text-graphite">{pix.payload}</p>
            <CopyTextButton text={pix.payload} label="Copiar código" className="label-caps mt-1.5 rounded-full bg-petrol px-4 py-1.5 text-[11px] text-[#111] transition-colors hover:bg-paper" />
          </div>
        </div>
      </div>

      <p className="mt-4 text-xs text-graphite">
        Recebedor: {receiver}.{notice ? ` ${notice}` : ""}
      </p>
      {proofHref ? (
        <a href={proofHref} className="label-caps mt-4 inline-block rounded-full border border-petrol px-5 py-2.5 text-[11px] text-petrol transition-colors hover:bg-petrol hover:text-[#111]">
          Já paguei: enviar comprovante
        </a>
      ) : null}
    </section>
  );
}
