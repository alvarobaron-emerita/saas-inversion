"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import type { DefaultColumnTemplate, SearchSettingsData } from "@/types/search-settings";

async function fetchSearchSettings(): Promise<SearchSettingsData> {
  const res = await fetch("/api/search/settings");
  if (!res.ok) throw new Error("Error cargando ajustes");
  return res.json();
}

async function saveSearchSettings(data: SearchSettingsData): Promise<SearchSettingsData> {
  const res = await fetch("/api/search/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await res.json()).error ?? "Error guardando");
  return res.json();
}

function typeLabel(type: string): string {
  if (type === "text") return "Texto";
  if (type === "formula") return "Fórmula";
  if (type === "ai") return "IA";
  return type;
}

export function SearchDefaultColumnsEditor() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["search-settings"],
    queryFn: fetchSearchSettings,
  });
  const mutation = useMutation({
    mutationFn: saveSearchSettings,
    onSuccess: (saved) => {
      queryClient.setQueryData(["search-settings"], saved);
    },
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [type, setType] = useState<"text" | "formula" | "ai">("ai");
  const [header, setHeader] = useState("");
  const [formula, setFormula] = useState("");
  const [prompt, setPrompt] = useState("");
  const [outputStyle, setOutputStyle] = useState<"single" | "rating_and_reason">("single");
  const [headerCol1, setHeaderCol1] = useState("");
  const [headerCol2, setHeaderCol2] = useState("");

  const columns = data?.defaultColumns ?? [];

  const openAdd = () => {
    setEditIndex(null);
    setType("ai");
    setHeader("");
    setFormula("");
    setPrompt("");
    setOutputStyle("single");
    setHeaderCol1("");
    setHeaderCol2("");
    setDialogOpen(true);
  };

  const openEdit = (index: number) => {
    const t = columns[index];
    if (!t) return;
    setEditIndex(index);
    setType(t.type);
    setHeader(t.header);
    setFormula(t.formula ?? "");
    setPrompt(t.prompt ?? "");
    setOutputStyle((t.outputStyle as "single" | "rating_and_reason") ?? "single");
    setHeaderCol1(t.headerCol1 ?? t.header);
    setHeaderCol2(t.headerCol2 ?? "");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditIndex(null);
  };

  const buildTemplate = (): DefaultColumnTemplate | null => {
    if (type === "text") {
      if (!header.trim()) return null;
      return { type: "text", header: header.trim() };
    }
    if (type === "formula") {
      if (!header.trim() || !formula.trim()) return null;
      return { type: "formula", header: header.trim(), formula: formula.trim() };
    }
    if (type === "ai") {
      if (!prompt.trim()) return null;
      if (outputStyle === "rating_and_reason") {
        if (!headerCol1.trim() || !headerCol2.trim()) return null;
        return {
          type: "ai",
          prompt: prompt.trim(),
          outputStyle: "rating_and_reason",
          header: headerCol1.trim(),
          headerCol1: headerCol1.trim(),
          headerCol2: headerCol2.trim(),
        };
      }
      if (!header.trim()) return null;
      return {
        type: "ai",
        header: header.trim(),
        prompt: prompt.trim(),
        outputStyle: "single",
      };
    }
    return null;
  };

  const handleSaveTemplate = () => {
    const t = buildTemplate();
    if (!t) return;
    const next = [...columns];
    if (editIndex !== null) {
      next[editIndex] = t;
    } else {
      next.push(t);
    }
    mutation.mutate({ defaultColumns: next }, { onSuccess: () => closeDialog() });
  };

  const handleDelete = (index: number) => {
    const next = columns.filter((_, i) => i !== index);
    mutation.mutate({ defaultColumns: next });
  };

  const handleMove = (index: number, dir: number) => {
    const to = index + dir;
    if (to < 0 || to >= columns.length) return;
    const next = [...columns];
    [next[index], next[to]] = [next[to], next[index]];
    mutation.mutate({ defaultColumns: next });
  };

  if (isLoading) return <div className="p-6 text-zinc-500">Cargando...</div>;
  if (error) return <div className="p-6 text-red-600">Error al cargar ajustes</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600">
          Estas columnas se añadirán al final de cada proyecto nuevo al subir un Excel. El contexto
          para columnas IA será siempre todas las columnas del proyecto.
        </p>
        <Button variant="outline" size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Añadir columna por defecto
        </Button>
      </div>

      {columns.length === 0 ? (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center text-zinc-500 text-sm">
          No hay columnas por defecto. Añade al menos una para que se apliquen en proyectos nuevos.
        </div>
      ) : (
        <ul className="space-y-2">
          {columns.map((col, index) => (
            <li
              key={index}
              className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3"
            >
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  className="p-1 rounded hover:bg-zinc-100 disabled:opacity-40"
                  aria-label="Subir"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === columns.length - 1}
                  className="p-1 rounded hover:bg-zinc-100 disabled:opacity-40"
                  aria-label="Bajar"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-zinc-900">
                  {col.type === "ai" && col.outputStyle === "rating_and_reason"
                    ? col.headerCol1 ?? col.header
                    : col.header}
                </span>
                {col.type === "ai" && col.outputStyle === "rating_and_reason" && col.headerCol2 && (
                  <span className="text-zinc-500 text-sm ml-2">
                    + {col.headerCol2}
                  </span>
                )}
                <span className="ml-2 text-xs text-zinc-400">({typeLabel(col.type)})</span>
                {col.type === "ai" && col.prompt && (
                  <p className="mt-1 text-xs text-zinc-500 truncate max-w-md" title={col.prompt}>
                    {col.prompt}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => openEdit(index)}
                  className="h-8 w-8"
                  aria-label="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(index)}
                  className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                  aria-label="Eliminar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="sm:max-w-md flex flex-col max-h-[90vh]">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>
              {editIndex !== null ? "Editar columna por defecto" : "Nueva columna por defecto"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-4">
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
            {type !== "ai" || outputStyle === "single" ? (
              <div>
                <Label>Nombre de columna</Label>
                <Input
                  placeholder="Ej: Notas, Relevo generacional"
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  className="mt-1"
                />
              </div>
            ) : null}
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
                        onChange={() => {
                          setOutputStyle("rating_and_reason");
                          if (!headerCol1) setHeaderCol1(header || "Score");
                          if (!headerCol2) setHeaderCol2((header || "Score") + " (explicación)");
                        }}
                        className="rounded border-zinc-300"
                      />
                      Dos columnas (rating + explicación)
                    </label>
                  </div>
                  {outputStyle === "rating_and_reason" && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label>Nombre columna 1</Label>
                        <Input
                          value={headerCol1}
                          onChange={(e) => setHeaderCol1(e.target.value)}
                          className="mt-1"
                          placeholder="Ej: Relevo generacional"
                        />
                        <p className="mt-1 text-xs text-zinc-500">Salida: número 1–10</p>
                      </div>
                      <div>
                        <Label>Nombre columna 2</Label>
                        <Input
                          value={headerCol2}
                          onChange={(e) => setHeaderCol2(e.target.value)}
                          className="mt-1"
                          placeholder="Ej: Relevo generacional (explicación)"
                        />
                        <p className="mt-1 text-xs text-zinc-500">Salida: texto (explicación breve)</p>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <Label>Prompt para el LLM</Label>
                  <Textarea
                    placeholder="Ej: Valora del 1 al 10 la probabilidad de relevo generacional en esta empresa y explica brevemente por qué."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="mt-1 min-h-[80px]"
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  En cada proyecto se enviarán todas las columnas del Excel como contexto al LLM.
                </p>
              </>
            )}
          </div>
          <div className="flex-shrink-0 pt-4 border-t border-zinc-100 flex justify-end gap-2">
            <Button variant="outline" onClick={closeDialog}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveTemplate}
              disabled={
                mutation.isPending ||
                (type === "ai" && outputStyle === "rating_and_reason"
                  ? !headerCol1.trim() || !headerCol2.trim() || !prompt.trim()
                  : type === "ai"
                    ? !prompt.trim() || (outputStyle === "single" && !header.trim())
                    : type === "formula"
                      ? !header.trim() || !formula.trim()
                      : !header.trim())
              }
            >
              {mutation.isPending ? "Guardando..." : editIndex !== null ? "Guardar" : "Añadir"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
