import * as XLSX from "xlsx";
import type { ParsedSheet } from "./types";

/**
 * Expands merged cells so the top-left value is repeated in every cell of the
 * merge range. This way sheet_to_json returns the value in each row and
 * collapseMarkBlocks can build proper arrays per column.
 */
function expandMergedCells(sheet: XLSX.WorkSheet): void {
  const merges = sheet["!merges"];
  if (!merges || merges.length === 0) return;

  for (const range of merges) {
    const { s, e } = range;
    const srcRef = XLSX.utils.encode_cell(s);
    const srcCell = sheet[srcRef];
    if (!srcCell) continue;

    for (let r = s.r; r <= e.r; r++) {
      for (let c = s.c; c <= e.c; c++) {
        if (r === s.r && c === s.c) continue;
        const ref = XLSX.utils.encode_cell({ r, c });
        sheet[ref] = { ...srcCell };
      }
    }
  }
}

export function parseExcel(buffer: ArrayBuffer): ParsedSheet {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  expandMergedCells(firstSheet);
  const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, {
    header: 1,
    defval: null,
    raw: false,
  });

  if (data.length === 0) {
    return { columns: [], rows: [] };
  }

  const firstRow = data[0] as unknown;
  const headers = (Array.isArray(firstRow) ? firstRow : []).map((h: unknown) => String(h ?? "").trim());
  const rows = data.slice(1).map((row) => {
    const obj: Record<string, string | number | null> = {};
    const raw = row as unknown as unknown[];
    const arr =
      raw.length >= headers.length
        ? raw
        : [...raw, ...Array.from<null>({ length: headers.length - raw.length }).fill(null)];
    headers.forEach((h, i) => {
      const val = arr[i];
      if (val === undefined || val === null) obj[h] = null;
      else if (typeof val === "number") obj[h] = val;
      else obj[h] = String(val);
    });
    return obj;
  });

  return { columns: headers, rows };
}

export function parseCSV(buffer: ArrayBuffer): ParsedSheet {
  const text = new TextDecoder("utf-8").decode(buffer);
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { columns: [], rows: [] };

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') inQuotes = !inQuotes;
      else if ((c === "," || c === ";") && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else current += c;
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => h.replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = parseLine(line).map((v) => v.replace(/^"|"$/g, ""));
    const obj: Record<string, string | number | null> = {};
    headers.forEach((h, i) => {
      const v = values[i];
      if (v === undefined || v === "") obj[h] = null;
      else if (/^-?\d+([.,]\d+)?$/.test(v)) obj[h] = parseFloat(v.replace(",", "."));
      else obj[h] = v;
    });
    return obj;
  });

  return { columns: headers, rows };
}
