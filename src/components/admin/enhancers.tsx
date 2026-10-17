"use client";

import { useEffect } from "react";

/** Valor comparável de uma célula: dinheiro, número pt-BR, data dd/mm/aaaa ou texto. */
function cellValue(text: string): number | string {
  const t = text.trim();
  if (!t || t === "—") return Number.NEGATIVE_INFINITY;
  const money = t.match(/^-?\s?R\$\s?(-?[\d.]+,\d{2})/);
  if (money) return Number(money[1].replace(/\./g, "").replace(",", "."));
  if (/^-?[\d.]+(,\d+)?%?$/.test(t)) return Number(t.replace("%", "").replace(/\./g, "").replace(",", "."));
  const date = t.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (date) return Date.UTC(Number(date[3]), Number(date[2]) - 1, Number(date[1]));
  return t.toLocaleLowerCase("pt-BR");
}

function compare(a: number | string, b: number | string) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "pt-BR", { numeric: true });
}

function sortByColumn(th: HTMLTableCellElement) {
  const table = th.closest("table");
  const tbody = table?.tBodies[0];
  if (!table || !tbody) return;
  const index = th.cellIndex;
  const direction = th.getAttribute("aria-sort") === "ascending" ? "descending" : "ascending";
  table.querySelectorAll("thead th").forEach((other) => other.removeAttribute("aria-sort"));
  th.setAttribute("aria-sort", direction);

  const rows = Array.from(tbody.rows).filter((row) => row.cells.length > index);
  rows.sort((r1, r2) => {
    const result = compare(cellValue(r1.cells[index].textContent ?? ""), cellValue(r2.cells[index].textContent ?? ""));
    return direction === "ascending" ? result : -result;
  });
  rows.forEach((row) => tbody.appendChild(row));
}

/**
 * Clique no título de uma coluna para ordenar qualquer tabela do painel (valores, datas e textos).
 * Funciona por delegação de evento: as telas não precisam de nenhuma mudança.
 */
export function TableEnhancer() {
  useEffect(() => {
    const isSortable = (th: Element | null): th is HTMLTableCellElement => {
      if (!th || th.tagName !== "TH") return false;
      const label = (th.textContent ?? "").trim().toLowerCase();
      const table = th.closest("table");
      return Boolean(label) && label !== "ações" && label !== "#" && Boolean(table?.tHead) && (table?.tBodies[0]?.rows.length ?? 0) > 1;
    };

    const onClick = (event: MouseEvent) => {
      const th = (event.target as Element | null)?.closest("main table thead th") ?? null;
      if (isSortable(th)) sortByColumn(th);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const th = (event.target as Element | null)?.closest("main table thead th") ?? null;
      if (isSortable(th)) {
        event.preventDefault();
        sortByColumn(th);
      }
    };
    // Deixa os títulos "clicáveis" para o teclado e para o leitor de tela.
    const markSortable = () => {
      document.querySelectorAll("main table thead th").forEach((th) => {
        if (isSortable(th) && !th.hasAttribute("tabindex")) {
          th.setAttribute("tabindex", "0");
          th.setAttribute("data-sortable", "true");
          th.setAttribute("title", "Clique para ordenar");
        }
      });
    };
    markSortable();
    const observer = new MutationObserver(markSortable);
    observer.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return null;
}

/** Mostra quantas coisas esperam ação no título da aba do navegador: "(3) Pedidos · Gestão Fazaê". */
export function TitleBadge({ count }: { count: number }) {
  useEffect(() => {
    const apply = () => {
      const base = document.title.replace(/^\(\d+\)\s*/, "");
      const next = count > 0 ? `(${count}) ${base}` : base;
      if (document.title !== next) document.title = next;
    };
    apply();
    const titleEl = document.querySelector("title");
    if (!titleEl) return undefined;
    const observer = new MutationObserver(apply);
    observer.observe(titleEl, { childList: true, characterData: true, subtree: true });
    return () => observer.disconnect();
  }, [count]);

  return null;
}
