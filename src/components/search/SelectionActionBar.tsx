"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, Pencil, Copy, Trash2, Sparkles } from "lucide-react";
import type { SearchViewItem } from "./ProjectTabs";

export interface AiColumnItem {
  id: string;
  header: string;
  field: string;
}

interface SelectionActionBarProps {
  selectedCount: number;
  views: SearchViewItem[];
  activeTab: string;
  aiColumns: AiColumnItem[];
  onMove: (status: string) => Promise<void>;
  onCopy: (status: string) => Promise<void>;
  onRunAI: (columnId: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onClearSelection: () => void;
  /** Ej: "Generando 3 de 10" cuando está ejecutando IA */
  runAIProgress?: string | null;
}

export function SelectionActionBar({
  selectedCount,
  views,
  activeTab,
  aiColumns,
  onMove,
  onCopy,
  onRunAI,
  onDelete,
  onClearSelection,
  runAIProgress,
}: SelectionActionBarProps) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [runAIOpen, setRunAIOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const runningAI = !!runAIProgress;

  const showInboxInMove = activeTab !== "inbox";

  const handleMove = async (status: string) => {
    setLoading(true);
    try {
      await onMove(status);
      setMoveOpen(false);
      onClearSelection();
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (status: string) => {
    setLoading(true);
    try {
      await onCopy(status);
      setCopyOpen(false);
      onClearSelection();
    } finally {
      setLoading(false);
    }
  };

  const handleRunAI = async (columnId: string) => {
    setRunAIOpen(false);
    try {
      await onRunAI(columnId);
    } catch {
      // Error ya manejado en el padre
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedCount} fila(s) seleccionada(s)?`)) return;
    setLoading(true);
    try {
      await onDelete();
      onClearSelection();
    } finally {
      setLoading(false);
    }
  };

  // Para Mover: no mostrar Bandeja de entrada si ya estás ahí.
  // Para Copiar: no mostrar la pestaña actual (no tiene sentido copiar al mismo tab).
  const renderDestinationList = (
    onSelect: (status: string) => void,
    includeInbox: boolean,
    excludeStatus?: string
  ) => (
    <>
      {includeInbox && excludeStatus !== "inbox" && (
        <li>
          <button
            type="button"
            className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100"
            onClick={() => onSelect("inbox")}
          >
            Bandeja de entrada
          </button>
        </li>
      )}
      {views
        .filter((view) => view.id !== excludeStatus)
        .map((view) => (
          <li key={view.id}>
            <button
              type="button"
              className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100"
              onClick={() => onSelect(view.id)}
            >
              {view.name}
            </button>
          </li>
        ))}
    </>
  );

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white px-6 py-3 shadow-lg">
      <div className="mx-auto flex max-w-4xl items-center gap-4">
        <span className="text-sm font-medium text-zinc-700">
          {selectedCount === 1
            ? "1 fila seleccionada"
            : `${selectedCount} filas seleccionadas`}
        </span>

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setMoveOpen((o) => !o); setCopyOpen(false); }}
            disabled={loading}
          >
            Mover
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
          {moveOpen && (
            <>
              <div
                className="fixed inset-0 z-0"
                aria-hidden
                onClick={() => setMoveOpen(false)}
              />
              <ul className="absolute bottom-full left-0 z-10 mb-1 min-w-[180px] rounded-md border border-zinc-200 bg-white py-1 shadow-md">
                {renderDestinationList(handleMove, showInboxInMove)}
              </ul>
            </>
          )}
        </div>

        {aiColumns.length > 0 && (
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRunAIOpen((o) => !o);
                setMoveOpen(false);
                setCopyOpen(false);
              }}
              disabled={loading || runningAI}
              title={runningAI ? runAIProgress ?? "Generando..." : "Rellenar con IA la columna elegida"}
            >
              <Sparkles className="mr-1 h-4 w-4" />
              {runningAI ? runAIProgress ?? "Generando..." : "Generar con IA"}
              {!runningAI && <ChevronDown className="ml-1 h-4 w-4" />}
            </Button>
            {runAIOpen && !runningAI && (
              <>
                <div
                  className="fixed inset-0 z-0"
                  aria-hidden
                  onClick={() => setRunAIOpen(false)}
                />
                <ul className="absolute bottom-full left-0 z-10 mb-1 min-w-[180px] rounded-md border border-zinc-200 bg-white py-1 shadow-md">
                  {aiColumns.map((col) => (
                    <li key={col.id}>
                      <button
                        type="button"
                        className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-100"
                        onClick={() => handleRunAI(col.id)}
                      >
                        {col.header}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}

        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setCopyOpen((o) => !o); setMoveOpen(false); }}
            disabled={loading}
          >
            <Copy className="mr-1 h-4 w-4" />
            Copiar
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
          {copyOpen && (
            <>
              <div
                className="fixed inset-0 z-0"
                aria-hidden
                onClick={() => setCopyOpen(false)}
              />
              <ul className="absolute bottom-full left-0 z-10 mb-1 min-w-[180px] rounded-md border border-zinc-200 bg-white py-1 shadow-md">
                {renderDestinationList(
                  (status) => handleCopy(status),
                  true,
                  activeTab
                )}
              </ul>
            </>
          )}
        </div>

        <Button variant="outline" size="sm" disabled={loading} className="opacity-60">
          <Pencil className="mr-1 h-4 w-4" />
          Editar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDelete}
          disabled={loading}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}
