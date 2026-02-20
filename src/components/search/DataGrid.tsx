"use client";

import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgGridReact } from "ag-grid-react";
import type { AgGridReact as AgGridReactType } from "ag-grid-react";
import type { ColDef } from "ag-grid-community";
import { evaluateFormula } from "@/lib/formulas/evaluator";
import "ag-grid-community/styles/ag-grid.css";
import "ag-grid-community/styles/ag-theme-alpine.css";

function widthFromHeaderLength(header: string): number {
  return Math.max(120, Math.min(600, header.length * 10));
}

interface ColumnDef {
  id: string;
  field: string;
  header: string;
  type: string;
  formula?: string | null;
  prompt?: string | null;
  width?: number | null;
  pinned?: string | null;
  hidden?: boolean;
}

type CellValue = string | number | null | (string | number)[];

interface RowData {
  id: string;
  rowIndex: number;
  status: string;
  data: Record<string, CellValue>;
}

interface DataGridProps {
  columns: ColumnDef[];
  rows: RowData[];
  onColumnPinChange?: (columnId: string, pinned: "left" | "right" | null) => void;
  onSelectionChanged?: (selectedRowIds: string[]) => void;
  selectedColumnIds?: string[];
  onColumnSelectionChanged?: (columnIds: string[]) => void;
  onColumnResized?: (columnId: string, width: number) => void;
  onColumnVisible?: (columnId: string, visible: boolean) => void;
  onHeaderDoubleClick?: (columnId: string) => void;
}

function sortColumnsByPinned<T extends { pinned?: string | null }>(cols: T[]): T[] {
  const left = cols.filter((c) => c.pinned === "left");
  const none = cols.filter((c) => !c.pinned || c.pinned !== "left" && c.pinned !== "right");
  const right = cols.filter((c) => c.pinned === "right");
  return [...left, ...none, ...right];
}

const checkboxColumnDef: ColDef = {
  colId: "_select",
  headerName: "",
  width: 48,
  minWidth: 48,
  maxWidth: 48,
  resizable: false,
  sortable: false,
  filter: false,
  pinned: "left",
  checkboxSelection: true,
  headerCheckboxSelection: true,
};

export const DataGrid = forwardRef<AgGridReactType, DataGridProps>(function DataGrid(
  {
    columns,
    rows,
    onColumnPinChange,
    onSelectionChanged,
    selectedColumnIds = [],
    onColumnSelectionChanged,
    onColumnResized,
    onColumnVisible,
    onHeaderDoubleClick,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridApiRef = useRef<{ api: unknown } | null>(null);

  const sortedColumns = useMemo(() => sortColumnsByPinned(columns), [columns]);

  const columnDefs: ColDef[] = useMemo(
    () => [
      ...(onSelectionChanged ? [checkboxColumnDef] : []),
      ...sortedColumns.map((col) => {
        const colId = col.id;
        const isSelected = selectedColumnIds.includes(colId);
        const width =
          col.width != null && col.width > 0
            ? col.width
            : widthFromHeaderLength(col.header);
        const base: ColDef = {
          colId: col.id,
          field: col.field,
          headerName: col.header,
          editable: col.type === "text",
          width,
          minWidth: 50,
          flex: 0,
          resizable: true,
          filter: true,
          sortable: true,
          pinned: col.pinned === "left" || col.pinned === "right" ? col.pinned : undefined,
          hide: col.hidden === true,
          headerClass: isSelected ? "ag-column-selected" : undefined,
        };
        if (col.type === "formula" && col.formula) {
          base.valueGetter = (params) => {
            const data = params.data as Record<string, CellValue>;
            const rowData: Record<string, string | number | null> = {};
            for (const k of Object.keys(data)) {
              if (k.startsWith("_")) continue;
              const v = data[k];
              rowData[k] = Array.isArray(v) ? (v[0] as string | number) ?? null : (v as string | number | null);
            }
            return evaluateFormula(col.formula!, rowData);
          };
          base.editable = false;
        }
        if (col.type === "ai") {
          base.editable = false;
        }
        if (onColumnPinChange || onColumnVisible) {
          base.mainMenuItems = [
            ...(onColumnPinChange
              ? [
                  { name: "Fijar a la izquierda", action: () => onColumnPinChange(colId, "left") },
                  { name: "Fijar a la derecha", action: () => onColumnPinChange(colId, "right") },
                  { name: "No fijar", action: () => onColumnPinChange(colId, null) },
                ]
              : []),
            ...(onColumnVisible
              ? [{ name: "Ocultar columna", action: () => onColumnVisible(colId, false) }]
              : []),
          ];
        }
        return base;
      }),
    ],
    [sortedColumns, onColumnPinChange, onSelectionChanged, selectedColumnIds, onColumnVisible]
  );

  const onColumnResizedCallback = useCallback(
    (event: unknown) => {
      if (!onColumnResized) return;
      const e = event as { column?: { getColId: () => string; getActualWidth?: () => number; getWidth?: () => number } | null; finished?: boolean };
      if (!e.finished || !e.column) return;
      const colId = e.column.getColId();
      if (colId === "_select") return;
      const col = e.column as { getActualWidth?: () => number; getWidth?: () => number };
      const w = col.getActualWidth?.() ?? col.getWidth?.() ?? 0;
      const width = Math.round(Number(w));
      if (width >= 50) onColumnResized(colId, width);
    },
    [onColumnResized]
  );

  const [gridReady, setGridReady] = useState(false);
  const onGridReady = useCallback((event: { api: unknown }) => {
    gridApiRef.current = { api: event.api };
    setGridReady(true);
  }, []);

  // Delegación: un solo listener en el contenedor para que ⌘/Ctrl+clic en encabezado
  // no sea capturado antes por ag-Grid (sort). Captura en fase capture y previene.
  useEffect(() => {
    if (!onColumnSelectionChanged || !containerRef.current || !gridReady) return;
    const el = containerRef.current;

    const clickHandler = (e: MouseEvent) => {
      const isModifier = e.ctrlKey || e.metaKey;
      if (!isModifier) return;
      const cell = (e.target as HTMLElement).closest?.(".ag-header-cell") as HTMLElement | null;
      if (!cell) return;
      const colId = cell.getAttribute("col-id") ?? cell.dataset?.colId ?? "";
      if (!colId || colId === "_select") return;
      e.preventDefault();
      e.stopPropagation();
      onColumnSelectionChanged(
        selectedColumnIds.includes(colId)
          ? selectedColumnIds.filter((id) => id !== colId)
          : [...selectedColumnIds, colId]
      );
    };

    const dblclickHandler = (e: MouseEvent) => {
      if (!onHeaderDoubleClick) return;
      const cell = (e.target as HTMLElement).closest?.(".ag-header-cell") as HTMLElement | null;
      if (!cell) return;
      const colId = cell.getAttribute("col-id") ?? cell.dataset?.colId ?? "";
      if (!colId || colId === "_select") return;
      e.preventDefault();
      e.stopPropagation();
      onHeaderDoubleClick(colId);
    };

    el.addEventListener("click", clickHandler, true);
    el.addEventListener("dblclick", dblclickHandler, true);

    // Tooltip en encabezados (se aplica cuando el grid ya pintó; puede re-ejecutarse si hace falta)
    const setTitles = () => {
      el.querySelectorAll<HTMLElement>(".ag-header-cell").forEach((cell) => {
        const colId = cell.getAttribute("col-id") ?? "";
        if (colId && colId !== "_select") {
          cell.setAttribute("title", "Ctrl+clic (o ⌘+clic) para seleccionar. Doble clic para ajustar al contenido.");
        }
      });
    };
    setTitles();
    const t = window.setTimeout(setTitles, 500);

    return () => {
      el.removeEventListener("click", clickHandler, true);
      el.removeEventListener("dblclick", dblclickHandler, true);
      window.clearTimeout(t);
    };
  }, [onColumnSelectionChanged, selectedColumnIds, gridReady, onHeaderDoubleClick]);

  const onSelectionChangedCallback = useCallback(
    (event: { api: { getSelectedRows: () => { _id: string }[] } }) => {
      if (!onSelectionChanged) return;
      const rows = event.api.getSelectedRows();
      onSelectionChanged(rows.map((r) => r._id));
    },
    [onSelectionChanged]
  );

  const rowData = useMemo(
    () =>
      rows.map((r) => ({
        ...r.data,
        _id: r.id,
        _rowIndex: r.rowIndex,
        _status: r.status,
      })),
    [rows]
  );

  const getRowId = useCallback((params: { data: { _id: string } }) => params.data._id, []);

  const formatCellValue = useCallback((v: unknown): string => {
    if (Array.isArray(v)) {
      if (v.length === 0) return "";
      return "[" + (v as (string | number)[]).join("; ") + "]";
    }
    return v != null ? String(v) : "";
  }, []);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      flex: 1,
      minWidth: 80,
      valueFormatter: (params) => formatCellValue(params.value),
    }),
    [formatCellValue]
  );

  const [cellPopover, setCellPopover] = useState<{
    show: boolean;
    content: string;
    left: number;
    top: number;
  }>({ show: false, content: "", left: 0, top: 0 });
  const cellPopoverRef = useRef<HTMLDivElement>(null);

  const onCellDoubleClicked = useCallback(
    (event: { event?: Event | null; colId?: string }) => {
      if (event.colId === "_select") return;
      const cellEl = (event.event?.target as HTMLElement)?.closest?.(".ag-cell");
      if (!cellEl) return;
      const el = cellEl as HTMLElement;
      const content = el.textContent?.trim() ?? "";
      if (!content) return;
      const truncated = el.scrollWidth > el.clientWidth || el.scrollHeight > el.clientHeight;
      if (!truncated) return;
      event.event?.preventDefault?.();
      event.event?.stopPropagation?.();
      const rect = el.getBoundingClientRect();
      setCellPopover({
        show: true,
        content,
        left: rect.left,
        top: rect.bottom + 4,
      });
    },
    []
  );

  useEffect(() => {
    if (!cellPopover.show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCellPopover((p) => ({ ...p, show: false }));
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (cellPopoverRef.current && !cellPopoverRef.current.contains(target)) {
        setCellPopover((p) => ({ ...p, show: false }));
      }
    };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => window.addEventListener("click", onClick, true), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick, true);
      clearTimeout(t);
    };
  }, [cellPopover.show]);

  return (
    <div ref={containerRef} className="ag-theme-alpine h-full w-full" style={{ minHeight: 400 }}>
      <AgGridReact
        ref={ref}
        rowData={rowData}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        getRowId={getRowId}
        domLayout="normal"
        enableCellTextSelection
        suppressRowClickSelection
        animateRows
        rowBuffer={50}
        suppressColumnVirtualisation={false}
        rowSelection={onSelectionChanged ? "multiple" : undefined}
        onSelectionChanged={onSelectionChanged ? onSelectionChangedCallback : undefined}
        onGridReady={onGridReady}
        onColumnResized={onColumnResized ? onColumnResizedCallback : undefined}
        onCellDoubleClicked={onCellDoubleClicked}
      />
      {cellPopover.show && (
        <div
          ref={cellPopoverRef}
          className="fixed z-[100] max-w-md rounded-md border border-zinc-200 bg-white px-3 py-2 shadow-lg text-sm text-zinc-800 whitespace-pre-wrap break-words"
          style={{
            left: Math.min(cellPopover.left, window.innerWidth - 360),
            top: cellPopover.top,
          }}
          role="tooltip"
        >
          {cellPopover.content}
        </div>
      )}
    </div>
  );
});
