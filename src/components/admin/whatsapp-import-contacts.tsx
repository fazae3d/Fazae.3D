"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { importContactsAction } from "@/app/admin/conversas/cadencias/actions";
import { Select } from "@/components/select";
import { useToast } from "@/components/admin/toast";
import { detectColumns, parseCsv, prepareImportRows } from "@/lib/wa-cadence";
import { formatPhone } from "@/lib/whatsapp";
import type { ImportResult } from "@/server/repositories/wa-cadence-repository";

const SELECT_CLASS = "rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm focus:border-petrol";
const FIELD = "w-full rounded-lg border border-mist bg-transparent px-2.5 py-2 text-sm outline-none focus:border-petrol";

function columnLabel(index: number, header: unknown, hasHeader: boolean) {
  const letter = String.fromCharCode(65 + (index % 26));
  const title = hasHeader ? String(header ?? "").trim() : "";
  return title ? `${letter}: ${title}` : `Coluna ${letter}`;
}

/** Importa uma planilha (Excel ou CSV) com nome e telefone, cria os contatos e, se quiser, já coloca todos numa cadência. */
export function WhatsAppImportContacts({ cadences }: { cadences: { id: string; name: string }[] }) {
  const { toast } = useToast();
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<unknown[][]>([]);
  const [nameCol, setNameCol] = useState(0);
  const [phoneCol, setPhoneCol] = useState(1);
  const [hasHeader, setHasHeader] = useState(true);
  const [listName, setListName] = useState("");
  const [cadenceId, setCadenceId] = useState("");
  const [skipExisting, setSkipExisting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const onFile = async (file: File | undefined) => {
    setError(null);
    setResult(null);
    if (!file) return;
    const ext = file.name.toLowerCase().split(".").pop();
    try {
      let data: unknown[][];
      if (ext === "xlsx") {
        const { readSheet } = await import("read-excel-file/browser");
        data = (await readSheet(file)) as unknown[][];
      } else if (ext === "csv" || ext === "txt") {
        data = parseCsv(await file.text());
      } else {
        setError("Formato não suportado. Salve a planilha como .xlsx ou .csv e tente de novo (arquivos .xls antigos não abrem).");
        return;
      }
      if (data.length === 0) {
        setError("A planilha está vazia.");
        return;
      }
      const cols = detectColumns(data);
      setRows(data);
      setNameCol(cols.nameCol);
      setPhoneCol(cols.phoneCol);
      setHasHeader(cols.hasHeader);
      setFileName(file.name);
      if (!listName) setListName(file.name.replace(/\.[^.]+$/, "").slice(0, 40));
    } catch {
      setError("Não consegui ler esse arquivo. Confira se é uma planilha .xlsx ou .csv válida.");
    }
  };

  const width = Math.max(2, ...rows.slice(0, 50).map((r) => r.length));
  const columnOptions = Array.from({ length: Math.min(width, 26) }, (_, i) => ({ value: String(i), label: columnLabel(i, rows[0]?.[i], hasHeader) }));
  const prepared = useMemo(() => (rows.length ? prepareImportRows(rows, { nameCol, phoneCol, hasHeader }) : null), [rows, nameCol, phoneCol, hasHeader]);

  const submit = async () => {
    if (!prepared || prepared.valid.length === 0) return;
    setPending(true);
    setError(null);
    const response = await importContactsAction({ rows: prepared.valid, listName, cadenceId: cadenceId || undefined, skipExisting });
    setPending(false);
    if (!response.success) {
      setError(response.error);
      return;
    }
    setResult(response.result);
    setRows([]);
    setFileName("");
    toast("Lista importada");
  };

  return (
    <div className="space-y-5">
      <div className="admin-card rounded-xl border border-mist p-5">
        <p className="font-medium">1. Escolha a planilha</p>
        <p className="mt-1 text-sm text-graphite">Excel (.xlsx) ou CSV com pelo menos duas colunas: nome e telefone (com DDD). O arquivo é lido aqui no seu navegador; só os contatos seguem para o painel.</p>
        <input
          type="file"
          accept=".xlsx,.csv,.txt"
          onChange={(e) => void onFile(e.target.files?.[0])}
          className="mt-3 block w-full text-sm text-graphite file:mr-3 file:rounded-lg file:border file:border-mist file:bg-transparent file:px-4 file:py-2 file:text-sm file:text-ink hover:file:border-petrol"
        />
        {error ? <p className="mt-2 text-sm text-red-500">{error}</p> : null}
      </div>

      {prepared ? (
        <>
          <div className="admin-card rounded-xl border border-mist p-5">
            <p className="font-medium">2. Confira as colunas — {fileName}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-graphite">Coluna do nome</label>
                <Select value={String(nameCol)} onChange={(v) => setNameCol(Number(v))} options={columnOptions} className={SELECT_CLASS} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-graphite">Coluna do telefone</label>
                <Select value={String(phoneCol)} onChange={(v) => setPhoneCol(Number(v))} options={columnOptions} className={SELECT_CLASS} />
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm">
              <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} className="h-4 w-4 accent-[#b6ff00]" />
              A primeira linha é o cabeçalho (títulos das colunas)
            </label>

            <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                <strong className="text-petrol">{prepared.valid.length}</strong> contatos válidos
              </span>
              <span className="text-graphite">{prepared.invalid.length} telefones inválidos</span>
              {prepared.landlines > 0 ? <span className="text-graphite" title="Telefone fixo normalmente não tem WhatsApp">{prepared.landlines} fixos (pulados)</span> : null}
              <span className="text-graphite">{prepared.duplicates} repetidos no arquivo</span>
            </div>
            {prepared.valid.length > 0 ? (
              <div className="mt-3 overflow-x-auto rounded-lg border border-mist">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-mist text-xs text-graphite">
                      <th className="px-3 py-2 font-medium">Nome</th>
                      <th className="px-3 py-2 font-medium">Telefone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-mist">
                    {prepared.valid.slice(0, 6).map((r) => (
                      <tr key={r.phone}>
                        <td className="px-3 py-2">{r.name || <span className="text-graphite">(sem nome)</span>}</td>
                        <td className="px-3 py-2">{formatPhone(r.phone)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {prepared.valid.length > 6 ? <p className="border-t border-mist px-3 py-2 text-xs text-graphite">… e mais {prepared.valid.length - 6}.</p> : null}
              </div>
            ) : (
              <p className="mt-3 text-sm text-red-500">Nenhum telefone válido nessas colunas. Troque a coluna do telefone acima.</p>
            )}
            {prepared.invalid.length > 0 ? (
              <details className="mt-3 text-xs text-graphite">
                <summary className="cursor-pointer">Ver telefones inválidos</summary>
                <ul className="mt-1 list-disc pl-5">
                  {prepared.invalid.slice(0, 15).map((i) => (
                    <li key={i.line}>
                      linha {i.line}: {i.value}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>

          <div className="admin-card rounded-xl border border-mist p-5">
            <p className="font-medium">3. O que fazer com a lista</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-graphite">Nome da lista (vira etiqueta nos contatos)</label>
                <input value={listName} onChange={(e) => setListName(e.target.value)} placeholder="Ex.: feira-novembro" className={FIELD} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-graphite">Cadência</label>
                <Select
                  value={cadenceId}
                  onChange={setCadenceId}
                  options={[{ value: "", label: "Só importar (sem enviar nada)" }, ...cadences.map((c) => ({ value: c.id, label: c.name }))]}
                  className={SELECT_CLASS}
                />
              </div>
            </div>
            <label className="mt-3 flex items-start gap-2 text-sm">
              <input type="checkbox" checked={skipExisting} onChange={(e) => setSkipExisting(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#b6ff00]" />
              <span>
                Pular quem já é cliente ou já tem conversa
                <span className="block text-xs text-graphite">Recomendado: evita mandar mensagem fria para quem já conhece a loja. Quem pediu para sair nunca recebe.</span>
              </span>
            </label>
            <p className="mt-3 text-xs text-graphite">
              {cadenceId
                ? "Os contatos entram na cadência agora, mas as mensagens só saem quando o envio automático estiver ligado, no horário e no limite diário que você definiu."
                : "Os contatos ficam em Conversas, marcados como prospecção. Dá para colocá-los numa cadência depois."}
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={pending || prepared.valid.length === 0}
              className="mt-4 rounded-lg bg-petrol px-5 py-2.5 text-sm font-semibold text-[#111] disabled:opacity-50"
            >
              {pending ? "Importando…" : `Importar ${prepared.valid.length} contatos`}
            </button>
          </div>
        </>
      ) : null}

      {result ? (
        <div className="admin-card rounded-xl border border-petrol/50 p-5 text-sm">
          <p className="font-medium">Importação concluída</p>
          <ul className="mt-2 space-y-1">
            <li>
              <strong className="text-petrol">{result.created}</strong> contatos novos criados
            </li>
            {result.enrolled > 0 ? (
              <li>
                <strong className="text-petrol">{result.enrolled}</strong> colocados na cadência
              </li>
            ) : null}
            {result.alreadyHadConversation > 0 ? <li className="text-graphite">{result.alreadyHadConversation} já tinham conversa{result.optedOut > 0 ? ` (${result.optedOut} pediram para sair)` : ""}</li> : null}
            {result.skippedCustomers > 0 ? <li className="text-graphite">{result.skippedCustomers} já são clientes e foram pulados</li> : null}
            {result.invalid > 0 ? <li className="text-graphite">{result.invalid} telefones inválidos</li> : null}
            {result.landlines > 0 ? <li className="text-graphite">{result.landlines} telefones fixos pulados (sem WhatsApp)</li> : null}
            {result.duplicates > 0 ? <li className="text-graphite">{result.duplicates} repetidos</li> : null}
          </ul>
          <p className="mt-3 flex gap-4">
            <Link href="/admin/conversas" className="text-petrol hover:underline">
              Ver em Conversas
            </Link>
            <Link href="/admin/conversas/cadencias" className="text-petrol hover:underline">
              Ver cadências
            </Link>
          </p>
        </div>
      ) : null}
    </div>
  );
}
