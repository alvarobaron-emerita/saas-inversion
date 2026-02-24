"use client";

import { forwardRef, useImperativeHandle, useMemo, useState, useCallback, useEffect } from "react";

function formatCellValue(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) {
    if (v.length === 0) return "";
    return "[" + (v as (string | number)[]).join("; ") + "]";
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export type SetFilterModel = { filterType: "set"; values: string[] } | null;

interface SetFilterCustomProps {
  api: { forEachNode: (cb: (node: { data?: Record<string, unknown> }) => void) => void };
  column: { getColId: () => string };
  colDef: { field?: string };
  filterChangedCallback: (options?: { apply?: boolean }) => void;
  valueGetter?: (node: { data?: Record<string, unknown> }) => unknown;
  /** Valores únicos precalculados (p. ej. desde el padre). Si se pasan, el filtro no usa api.forEachNode y abre al instante. */
  values?: string[];
}

export const SetFilterCustom = forwardRef(function SetFilterCustom(
  props: SetFilterCustomProps,
  ref: React.Ref<{
    getModel: () => SetFilterModel;
    setModel: (model: SetFilterModel) => void;
    doesFilterPass: (params: { node: { data?: Record<string, unknown> }; colDef?: { field?: string }; api?: { getValue: (colId: string, node: { data?: Record<string, unknown> }) => unknown } }) => boolean;
    isFilterActive: () => boolean;
  }>
) {
  const { api, column, colDef, filterChangedCallback, valueGetter, values: valuesFromParent } = props;
  const colId = column.getColId();
  const field = colDef.field ?? colId;

  const [uniqueValues, setUniqueValues] = useState<string[]>(() => valuesFromParent ?? []);
  const [selected, setSelected] = useState<Set<string>>(() => new Set(valuesFromParent ?? []));
  const [search, setSearch] = useState("");
  const [appliedModel, setAppliedModel] = useState<Set<string> | null>(null);

  const getValue = useCallback(
    (node: { data?: Record<string, unknown> }) => {
      if (valueGetter) return valueGetter(node);
      const v = node.data?.[field];
      return v;
    },
    [valueGetter, field]
  );

  useEffect(() => {
    if (valuesFromParent !== undefined) {
      setUniqueValues(valuesFromParent);
      setSelected(new Set(valuesFromParent));
      setAppliedModel(null);
      return;
    }
    const values = new Set<string>();
    api.forEachNode((node) => {
      const v = getValue(node);
      const s = formatCellValue(v);
      if (s !== "") values.add(s);
    });
    const sorted = Array.from(values).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    setUniqueValues(sorted);
    setSelected(new Set(sorted));
    setAppliedModel(null);
  }, [valuesFromParent, api, getValue]);

  const filteredValues = useMemo(() => {
    if (!search.trim()) return uniqueValues;
    const q = search.toLowerCase();
    return uniqueValues.filter((v) => v.toLowerCase().includes(q));
  }, [uniqueValues, search]);

  const selectAll = useCallback(() => {
    setSelected(new Set(uniqueValues));
  }, [uniqueValues]);

  const clearAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toggle = useCallback((value: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }, []);

  const apply = useCallback(() => {
    setAppliedModel(new Set(selected));
    filterChangedCallback({ apply: true });
  }, [selected, filterChangedCallback]);

  const reset = useCallback(() => {
    setSelected(new Set(uniqueValues));
    setAppliedModel(null);
    filterChangedCallback({ apply: true });
  }, [uniqueValues, filterChangedCallback]);

  useImperativeHandle(
    ref,
    () => ({
      getModel(): SetFilterModel {
        if (appliedModel === null && selected.size === uniqueValues.length) return null;
        const values = appliedModel !== null ? appliedModel : selected;
        if (values.size === 0) return { filterType: "set", values: [] };
        if (values.size === uniqueValues.length) return null;
        return { filterType: "set", values: Array.from(values) };
      },
      setModel(model: SetFilterModel) {
        if (model === null) {
          setSelected(new Set(uniqueValues));
          setAppliedModel(null);
          return;
        }
        const set = new Set(model.values);
        setSelected(set);
        setAppliedModel(set);
      },
      doesFilterPass(params: {
        node: { data?: Record<string, unknown> };
        colDef?: { field?: string };
        api?: { getValue: (colId: string, node: { data?: Record<string, unknown> }) => unknown };
      }): boolean {
        const values = appliedModel ?? selected;
        if (values.size === 0) return false;
        if (values.size === uniqueValues.length) return true;
        const v = getValue(params.node);
        const s = formatCellValue(v);
        return values.has(s);
      },
      isFilterActive(): boolean {
        const values = appliedModel ?? selected;
        return values.size < uniqueValues.length;
      },
    }),
    [appliedModel, selected, uniqueValues, getValue]
  );

  return (
    <div
      className="set-filter-custom"
      style={{
        display: "flex",
        flexDirection: "column",
        width: 260,
        height: 320,
        minHeight: 320,
        maxHeight: 320,
        backgroundColor: "#fff",
        border: "1px solid #e4e4e7",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        overflow: "hidden",
      }}
    >
      <div style={{ flex: "0 0 auto", padding: "10px 12px", borderBottom: "1px solid #e4e4e7", backgroundColor: "#fafafa" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, fontSize: 12, color: "#71717a" }}>
          <button
            type="button"
            onClick={selectAll}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#18181b", fontWeight: 500, textDecoration: "underline", fontSize: 12 }}
          >
            Seleccionar todo ({uniqueValues.length})
          </button>
          <button
            type="button"
            onClick={clearAll}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "#71717a", fontSize: 12, textDecoration: "underline" }}
          >
            Limpiar
          </button>
        </div>
        <div style={{ fontSize: 11, color: "#71717a", marginBottom: 6 }}>
          {uniqueValues.length === 0
            ? (valuesFromParent !== undefined ? "Sin datos" : "Cargando…")
            : `Mostrando ${filteredValues.length} de ${uniqueValues.length}`}
        </div>
        <input
          type="text"
          placeholder="Buscar…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "6px 10px",
            border: "1px solid #e4e4e7",
            borderRadius: 6,
            fontSize: 13,
            outline: "none",
          }}
        />
      </div>

      <div
        style={{
          flex: "1 1 0",
          minHeight: 0,
          overflowY: "auto",
          padding: "6px 0",
        }}
      >
        {filteredValues.length === 0 ? (
          <div style={{ padding: "16px 12px", fontSize: 13, color: "#71717a", textAlign: "center" }}>
            {uniqueValues.length === 0 ? "Sin datos" : "Ningún valor coincide con la búsqueda"}
          </div>
        ) : (
          filteredValues.map((value) => (
            <label
              key={value}
              style={{
                display: "flex",
                alignItems: "center",
                padding: "6px 12px",
                cursor: "pointer",
                fontSize: 13,
                color: "#18181b",
                gap: 8,
              }}
            >
              <input
                type="checkbox"
                checked={selected.has(value)}
                onChange={() => toggle(value)}
                style={{ width: 14, height: 14, margin: 0, flexShrink: 0 }}
              />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</span>
            </label>
          ))
        )}
      </div>

      <div
        style={{
          flex: "0 0 auto",
          display: "flex",
          gap: 8,
          justifyContent: "flex-end",
          padding: "10px 12px",
          borderTop: "1px solid #e4e4e7",
          backgroundColor: "#fafafa",
        }}
      >
        <button
          type="button"
          onClick={reset}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 500,
            border: "1px solid #d4d4d8",
            borderRadius: 6,
            backgroundColor: "#fff",
            color: "#3f3f46",
            cursor: "pointer",
          }}
        >
          Restablecer
        </button>
        <button
          type="button"
          onClick={apply}
          style={{
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 500,
            border: "none",
            borderRadius: 6,
            backgroundColor: "#18181b",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Aplicar
        </button>
      </div>
    </div>
  );
});
