import type { ParsedSheet, ParsedRow } from "./types";

const SABI_COLUMN_MAP: Record<string, string> = {
  "Nombre social": "nombre",
  "CIF": "cif",
  "CNAE": "cnae",
  "CNAE 2009": "cnae",
  "Actividad": "actividad",
  "Actividad CNAE": "actividad",
  "Fecha constitucion": "fecha_constitucion",
  "Facturación": "facturacion",
  "Importe Neto de la Cifra de Negocios": "facturacion",
  "Resultado": "resultado",
  "Resultado del ejercicio": "resultado",
  "Nº Empleados": "empleados",
  "Numero de empleados": "empleados",
  "Empleados": "empleados",
  "Provincia": "provincia",
  "Municipio": "municipio",
};

function toColId(header: string): string {
  const mapped = SABI_COLUMN_MAP[header];
  if (mapped) return mapped;
  return header
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 30) || `col_${header.length}`;
}

export function normalizeSabi(data: ParsedSheet): ParsedSheet {
  const colMap = new Map<string, string>();
  const newColumns: string[] = [];

  for (const h of data.columns) {
    const id = toColId(h);
    let finalId = id;
    let counter = 0;
    while (colMap.has(finalId)) {
      counter++;
      finalId = `${id}_${counter}`;
    }
    colMap.set(h, finalId);
    newColumns.push(finalId);
  }

  const rows = data.rows.map((row) => {
    const newRow: ParsedRow = {};
    colMap.forEach((newId, old) => {
      const val = row[old];
      newRow[newId] = val === undefined ? null : val;
    });
    return newRow;
  });

  return { columns: newColumns, rows };
}
