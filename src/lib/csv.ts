/** CSV para Excel brasileiro: separador ";", números com vírgula e BOM UTF-8 (senão os acentos quebram). */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "";
    const text = typeof value === "number" ? String(value).replace(".", ",") : value;
    // Evita "injeção de fórmula": texto digitado por clientes que começa com = + - @ viraria fórmula no Excel.
    const safe = /^[=+\-@]/.test(text) && typeof value === "string" ? `'${text}` : text;
    return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  return "\uFEFF" + [headers, ...rows].map((row) => row.map(cell).join(";")).join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, csv: string) {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
