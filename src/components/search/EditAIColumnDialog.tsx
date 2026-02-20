"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ContextMode = "all" | "selected" | "relevant";

interface ColumnSuggestion {
  columnId: string;
  header: string;
  reason: string;
}

export interface AIColumnToEdit {
  id: string;
  header: string;
  prompt?: string | null;
  inputColumnIds?: string[] | null;
  useOnlyRelevant?: boolean;
  outputStyle?: string | null;
  pairColumnId?: string | null;
}

interface EditAIColumnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: AIColumnToEdit | null;
  /** Otras columnas del proyecto (para multiselect), sin la columna que se edita */
  existingColumns: { id: string; header: string }[];
  onSaved: () => void;
}

export function EditAIColumnDialog({
  open,
  onOpenChange,
  column,
  existingColumns,
  onSaved,
}: EditAIColumnDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [contextMode, setContextMode] = useState<ContextMode>("all");
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ColumnSuggestion[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

  useEffect(() => {
    if (!column || !open) return;
    setPrompt(column.prompt ?? "");
    setSuggestions(null);
    const ids = column.inputColumnIds;
    if (column.useOnlyRelevant) {
      setContextMode("relevant");
      setSelectedColumnIds([]);
    } else if (Array.isArray(ids) && ids.length > 0) {
      setContextMode("selected");
      setSelectedColumnIds(ids);
    } else {
      setContextMode("all");
      setSelectedColumnIds([]);
    }
  }, [column, open]);

  const handleSuggestColumns = async () => {
    if (!prompt.trim() || existingColumns.length === 0) return;
    setSuggestLoading(true);
    try {
      const res = await fetch("/api/search/ai-column/suggest-columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          columns: existingColumns.map((c) => ({ id: c.id, header: c.header })),
        }),
      });
      if (!res.ok) {
        const err = (await res.json()).error ?? "Error";
        throw new Error(err);
      }
      const data = await res.json();
      const list = Array.isArray(data.suggestions) ? data.suggestions : [];
      setSuggestions(list);
      setSelectedColumnIds(list.map((s: ColumnSuggestion) => s.columnId));
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al sugerir columnas");
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!column) return;
    setLoading(true);
    try {
      const hasRelevantSelection =
        contextMode === "relevant" && suggestions != null && selectedColumnIds.length > 0;
      const inputIds =
        contextMode === "selected" && selectedColumnIds.length > 0
          ? selectedColumnIds
          : hasRelevantSelection
            ? selectedColumnIds
            : null;
      const useOnlyRelevant =
        contextMode === "relevant" && suggestions == null;

      const res = await fetch(`/api/search/columns/${column.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim() || null,
          inputColumnIds: inputIds,
          useOnlyRelevant,
        }),
      });
      if (!res.ok) throw new Error("Error");
      onOpenChange(false);
      onSaved();
    } catch {
      alert("Error al guardar");
    } finally {
      setLoading(false);
    }
  };

  if (!column) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar columna IA: {column.header}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {column.outputStyle === "rating_and_reason" && (
            <p className="text-sm text-zinc-600 rounded bg-zinc-100 p-2">
              Esta columna genera dos columnas: el rating (1–10) y la explicación en la columna vinculada. El prompt se aplica a ambas.
            </p>
          )}
          <div>
            <Label>Prompt para el LLM</Label>
            <Textarea
              placeholder="Ej: Resume en una frase el perfil de esta empresa"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
          </div>
          <div>
            <Label className="mb-2 block">Datos para el LLM</Label>
            <div className="space-y-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="editContextMode"
                  checked={contextMode === "all"}
                  onChange={() => setContextMode("all")}
                  className="rounded border-zinc-300"
                />
                Todas las columnas
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="editContextMode"
                  checked={contextMode === "selected"}
                  onChange={() => setContextMode("selected")}
                  className="rounded border-zinc-300"
                />
                Seleccionar columnas
              </label>
              {contextMode === "selected" && existingColumns.length > 0 && (
                <div className="ml-6 max-h-32 overflow-y-auto rounded border border-zinc-200 bg-zinc-50 p-2">
                  {existingColumns.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedColumnIds.includes(c.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedColumnIds((ids) => [...ids, c.id]);
                          } else {
                            setSelectedColumnIds((ids) => ids.filter((id) => id !== c.id));
                          }
                        }}
                        className="rounded border-zinc-300"
                      />
                      {c.header}
                    </label>
                  ))}
                </div>
              )}
              {contextMode === "selected" && existingColumns.length === 0 && (
                <p className="ml-6 text-zinc-500">No hay otras columnas en el proyecto.</p>
              )}
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="editContextMode"
                  checked={contextMode === "relevant"}
                  onChange={() => {
                    setContextMode("relevant");
                    setSuggestions(null);
                  }}
                  className="rounded border-zinc-300"
                />
                Todas las columnas; el LLM elige lo relevante
              </label>
              {contextMode === "relevant" && existingColumns.length > 0 && (
                <div className="ml-6 space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSuggestColumns}
                    disabled={suggestLoading || !prompt.trim()}
                  >
                    {suggestLoading ? "Sugiriendo..." : "Sugerir columnas según el prompt"}
                  </Button>
                  {suggestions != null && (
                    <div className="max-h-48 overflow-y-auto rounded border border-zinc-200 bg-zinc-50 p-2 space-y-2">
                      <p className="text-xs text-zinc-600 mb-1">
                        Revisa y edita la selección; solo se enviarán estas columnas al LLM.
                      </p>
                      {existingColumns.map((c) => {
                        const sug = suggestions.find((s) => s.columnId === c.id);
                        const checked = selectedColumnIds.includes(c.id);
                        return (
                          <label key={c.id} className="flex gap-2 py-1 block">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedColumnIds((ids) => [...ids, c.id]);
                                } else {
                                  setSelectedColumnIds((ids) => ids.filter((id) => id !== c.id));
                                }
                              }}
                              className="rounded border-zinc-300 mt-0.5 shrink-0"
                            />
                            <span className="flex-1 min-w-0">
                              <span className="font-medium text-zinc-800">{c.header}</span>
                              {sug?.reason && (
                                <p className="text-xs text-zinc-500 mt-0.5">{sug.reason}</p>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
