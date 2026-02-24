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
}

export const SetFilterCustom = forwardRef(function SetFilterCustom(
  props: SetFilterCustomProps,
  ref: React.Ref<{ getModel: () => SetFilterModel; setModel: (model: SetFilterModel) => void; doesFilterPass: (params: { node: { data?: Record<string, unknown> }; colDef?: { field?: string }; api?: { getValue: (colId: string, node: { data?: Record<string, unknown> }) => unknown } }) => boolean }>
) {
  const { api, column, colDef, filterChangedCallback, valueGetter } = props;
  const colId = column.getColId();
  const field = colDef.field ?? colId;

  const [uniqueValues, setUniqueValues] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
  }, [api, getValue]);

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
    }),
    [appliedModel, selected, uniqueValues, getValue]
  );

  return (
    <div className="ag-filter-body-wrapper ag-set-filter-list" style={{ minWidth: 200, maxHeight: 320 }}>
      <div className="ag-set-filter-select-all ag-filter-header-container">
        <a
          className="ag-set-filter-select-all-button"
          onClick={selectAll}
          role="button"
          style={{ marginRight: 8, cursor: "pointer" }}
        >
          Select all {uniqueValues.length}
        </a>
        <a
          className="ag-set-filter-clear-button"
          onClick={clearAll}
          role="button"
          style={{ cursor: "pointer" }}
        >
          Clear
        </a>
      </div>
      <div className="ag-set-filter-filter" style={{ padding: "4px 8px" }}>
        <span style={{ fontSize: 12, color: "#666" }}>Displaying {filteredValues.length}</span>
      </div>
      <div className="ag-set-filter-filter" style={{ padding: "4px 8px" }}>
        <input
          type="text"
          placeholder="Search..."
          className="ag-input-field-input ag-text-field-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", padding: "4px 8px" }}
        />
      </div>
      <div className="ag-set-filter-list" style={{ maxHeight: 200, overflowY: "auto", padding: "4px 0" }}>
        {filteredValues.map((value) => (
          <label
            key={value}
            className="ag-set-filter-item"
            style={{ display: "flex", alignItems: "center", padding: "2px 8px", cursor: "pointer", fontSize: 13 }}
          >
            <input
              type="checkbox"
              checked={selected.has(value)}
              onChange={() => toggle(value)}
              style={{ marginRight: 8 }}
            />
            <span className="ag-set-filter-item-value" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {value}
            </span>
          </label>
        ))}
      </div>
      <div className="ag-filter-apply-panel" style={{ padding: "8px", borderTop: "1px solid #eee", display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button type="button" className="ag-button ag-standard-button" onClick={reset} style={{ padding: "4px 12px" }}>
          Reset
        </button>
        <button type="button" className="ag-button ag-standard-button ag-button-primary" onClick={apply} style={{ padding: "4px 12px" }}>
          Apply
        </button>
      </div>
    </div>
  );
});
