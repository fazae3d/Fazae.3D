"use client";

import { quoteWhatsAppMessage } from "@/lib/quote";
import { DEFAULT_QUOTE_WHATSAPP_TEXT } from "@/lib/store-rules";

const VARIABLES: { key: string; label: string; help: string }[] = [
  { key: "nome", label: "Nome", help: "primeiro nome do cliente (Maria da Silva vira Maria)" },
  { key: "numero", label: "Número", help: "número do orçamento (ORC-0037)" },
  { key: "total", label: "Total", help: "valor total do orçamento" },
  { key: "validade", label: "Validade", help: "data até quando a condição vale" },
  { key: "economia", label: "Economia", help: "frase de desconto ou frete grátis; some sozinha quando o orçamento não tem" },
  { key: "link", label: "Link", help: "endereço do orçamento (obrigatório)" },
];

/**
 * Ajuda para escrever a mensagem do orçamento: botões que colocam a variável onde o cursor está, o que cada uma faz e uma prévia
 * com dados de exemplo (com e sem desconto).
 */
export function QuoteMessageHelp({ textareaId, value, onChange }: { textareaId: string; value: string; onChange: (value: string) => void }) {
  const insert = (key: string) => {
    const area = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    const token = `{{${key}}}`;
    if (!area) return onChange(`${value}${token}`);
    const start = area.selectionStart ?? value.length;
    const end = area.selectionEnd ?? value.length;
    onChange(`${value.slice(0, start)}${token}${value.slice(end)}`);
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const sample = {
    customerName: "Maria da Silva",
    number: 37,
    total: 250,
    validUntil: "2026-11-30T23:59:59.000Z",
    link: "https://www.fazae3d.com.br/orcamento/exemplo",
    template: value,
  };
  const withoutDeal = quoteWhatsAppMessage(sample);
  const withDeal = quoteWhatsAppMessage({ ...sample, savings: 30, freeShipping: true });

  return (
    <div className="mt-2 space-y-3 rounded-lg border border-mist p-3 text-xs">
      <div>
        <p className="mb-1.5 font-medium text-ink">Clique para colocar no texto, onde o cursor estiver:</p>
        <div className="flex flex-wrap gap-2">
          {VARIABLES.map((v) => (
            <button key={v.key} type="button" onClick={() => insert(v.key)} title={v.help} className="rounded-full border border-mist px-2.5 py-1 hover:border-petrol">
              + {v.label}
            </button>
          ))}
          <button type="button" onClick={() => onChange(DEFAULT_QUOTE_WHATSAPP_TEXT)} className="rounded-full px-2.5 py-1 text-graphite underline hover:text-ink">
            Voltar ao texto padrão
          </button>
        </div>
        <ul className="mt-2 space-y-0.5 text-graphite">
          {VARIABLES.map((v) => (
            <li key={v.key}>
              <code className="rounded bg-mist px-1">{`{{${v.key}}}`}</code> {v.help}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 font-medium text-ink">Como o cliente vai ler (dados de exemplo):</p>
        <p className="whitespace-pre-line rounded-lg bg-mist/60 p-2.5 text-ink">{withoutDeal}</p>
        <p className="mb-1 mt-2 text-graphite">Quando o orçamento tem desconto e frete grátis:</p>
        <p className="whitespace-pre-line rounded-lg bg-mist/60 p-2.5 text-ink">{withDeal}</p>
      </div>
    </div>
  );
}
