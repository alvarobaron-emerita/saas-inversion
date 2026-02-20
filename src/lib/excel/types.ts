export type ParsedCellValue = string | number | null | (string | number)[];

export interface ParsedRow {
  [colId: string]: ParsedCellValue;
}

export interface ParsedSheet {
  columns: string[];
  rows: ParsedRow[];
}
