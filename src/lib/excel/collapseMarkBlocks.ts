import type { ParsedSheet, ParsedRow, ParsedCellValue } from "./types";

const MARK_COLUMN_NAMES = ["mark"];
const FILAS_JUNTADAS_HEADER = "Filas originales";

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  return false;
}

function findMarkColumnIndex(columns: string[]): number {
  const normalized = columns.map((h) => h.trim().toLowerCase());
  const idx = normalized.findIndex((h) => MARK_COLUMN_NAMES.includes(h));
  return idx >= 0 ? idx : -1;
}

function getCellValue(row: ParsedRow, colName: string): unknown {
  const v = row[colName];
  if (v === undefined) return null;
  return v;
}

function collectValues(
  blockRows: ParsedRow[],
  colName: string
): (string | number)[] {
  const values: (string | number)[] = [];
  for (const row of blockRows) {
    const v = getCellValue(row, colName);
    if (isEmpty(v)) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        if (!isEmpty(item)) values.push(item as string | number);
      }
    } else {
      values.push(v as string | number);
    }
  }
  return values;
}

function toCellValue(values: (string | number)[]): ParsedCellValue {
  if (values.length === 0) return null;
  if (values.length === 1) return values[0];
  return values;
}

/**
 * Groups rows by the "Mark" column and consolidates each block into a single row.
 * Columns that have multiple values across sub-rows become arrays.
 * Adds a final column "Filas originales" with the number of original rows per block.
 */
export function collapseMarkBlocks(data: ParsedSheet): ParsedSheet {
  if (data.rows.length === 0) return data;

  const columns = data.columns;
  const markIdx = findMarkColumnIndex(columns);
  if (markIdx < 0) return data;

  const markColName = columns[markIdx];
  const blocks: ParsedRow[][] = [];
  let currentBlock: ParsedRow[] | null = null;

  for (const row of data.rows) {
    const markVal = getCellValue(row, markColName);
    if (!isEmpty(markVal)) {
      currentBlock = [row];
      blocks.push(currentBlock);
    } else {
      if (currentBlock) {
        currentBlock.push(row);
      } else {
        currentBlock = [row];
        blocks.push(currentBlock);
      }
    }
  }

  const allColumnNames = [...columns];
  if (!allColumnNames.includes(FILAS_JUNTADAS_HEADER)) {
    allColumnNames.push(FILAS_JUNTADAS_HEADER);
  }

  const newRows: ParsedRow[] = blocks.map((blockRows) => {
    const newRow: ParsedRow = {};
    for (const colName of columns) {
      const values = collectValues(blockRows, colName);
      newRow[colName] = toCellValue(values);
    }
    newRow[FILAS_JUNTADAS_HEADER] = blockRows.length;
    return newRow;
  });

  return {
    columns: allColumnNames,
    rows: newRows,
  };
}
