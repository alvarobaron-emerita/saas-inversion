"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";

type ContextMode = "all" | "selected" | "relevant";

interface ColumnSuggestion {
  columnId: string;
  header: string;
  reason: string;
}

interface ColumnEditorProps {
  projectId: string;
  onColumnAdded: () => void;
  /** Columnas existentes del proyecto (para multiselect en columna IA) */
  existingColumns?: { id: string; header: string }[];
}

export function ColumnEditor({ projectId, onColumnAdded, existingColumns = [] }: ColumnEditorProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"text" | "formula" | "ai">("text");
  const [header, setHeader] = useState("");
  const [prompt, setPrompt] = useState("");
  const [formula, setFormula] = useState("");
  const [outputStyle, setOutputStyle] = useState<"single" | "rating_and_reason">("single");
  const [contextMode, setContextMode] = useState<ContextMode>("all");
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<ColumnSuggestion[] | null>(null);
  const [suggestLoading, setSuggestLoading] = useState(false);

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
    if (!header.trim()) return;
    const baseField = header
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")
      .slice(0, 28) || `col_${Date.now()}`;
    const field = baseField.slice(0, 30);

    setLoading(true);
    try {
      const hasRelevantSelection =
        type === "ai" &&
        contextMode === "relevant" &&
        suggestions != null &&
        selectedColumnIds.length > 0;
      const inputIds =
        type === "ai" && contextMode === "selected" && selectedColumnIds.length > 0
          ? selectedColumnIds
          : hasRelevantSelection
            ? selectedColumnIds
            : undefined;
      const useOnlyRelevant =
        type === "ai" && contextMode === "relevant" && suggestions == null;

      if (type === "ai" && outputStyle === "rating_and_reason") {
        const reasonField = `${baseField}_motivo`.slice(0, 30);
        const reasonRes = await fetch("/api/search/columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            field: reasonField,
            header: `${header.trim()} (motivo)`,
            type: "text",
          }),
        });
        if (!reasonRes.ok) throw new Error("Error al crear columna de motivo");
        const reasonCol = await reasonRes.json();

        const mainRes = await fetch("/api/search/columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            field,
            header: header.trim(),
            type: "ai",
            prompt,
            inputColumnIds: inputIds,
            useOnlyRelevant,
            outputStyle: "rating_and_reason",
            pairColumnId: reasonCol.id,
          }),
        });
        if (!mainRes.ok) throw new Error("Error al crear columna IA");
      } else {
        const res = await fetch("/api/search/columns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            field,
            header: header.trim(),
            type,
            prompt: type === "ai" ? prompt : undefined,
            formula: type === "formula" ? formula : undefined,
            inputColumnIds: inputIds,
            useOnlyRelevant,
          }),
        });
        if (!res.ok) throw new Error("Error");
      }
      setOpen(false);
      setHeader("");
      setPrompt("");
      setFormula("");
      setOutputStyle("single");
      setContextMode("all");
      setSelectedColumnIds([]);
      setSuggestions(null);
      onColumnAdded();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al crear columna");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Añadir columna
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nueva columna</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Tipo</Label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "text" | "formula" | "ai")}
              className="mt-1 flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm"
            >
              <option value="text">Texto (editable)</option>
              <option value="formula">Fórmula (estilo Excel)</option>
              <option value="ai">IA (LLM)</option>
            </select>
          </div>
          <div>
            <Label>Nombre de columna</Label>
            <Input
              placeholder="Ej: Notas, Score, Análisis"
              value={header}
              onChange={(e) => setHeader(e.target.value)}
              className="mt-1"
            />
          </div>
          {type === "formula" && (
            <div>
              <Label>Fórmula (usa nombres de columnas como variables)</Label>
              <Input
                placeholder="Ej: = facturacion * 0.1"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                className="mt-1 font-mono"
              />
            </div>
          )}
          {type === "ai" && (
            <>
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
                <Label className="mb-2 block">Formato de salida</Label>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="outputStyle"
                      checked={outputStyle === "single"}
                      onChange={() => setOutputStyle("single")}
                      className="rounded border-zinc-300"
                    />
                    Texto libre
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="outputStyle"
                      checked={outputStyle === "rating_and_reason"}
                      onChange={() => setOutputStyle("rating_and_reason")}
                      className="rounded border-zinc-300"
                    />
                    Rating (1–10) + explicación (se crean dos columnas)
                  </label>
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Datos para el LLM</Label>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="contextMode"
                      checked={contextMode === "all"}
                      onChange={() => setContextMode("all")}
                      className="rounded border-zinc-300"
                    />
                    Todas las columnas
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="contextMode"
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
                      name="contextMode"
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
            </>
          )}
        </div>
        <Button onClick={handleSubmit} disabled={loading || !header.trim()}>
          {loading ? "Creando..." : "Crear"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
