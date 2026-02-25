"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2, Pin, PinOff, ArrowLeft, ArrowRight } from "lucide-react";

export interface ColumnForPin {
  id: string;
  header: string;
  pinned?: string | null;
  hidden?: boolean;
  type?: string;
  prompt?: string | null;
  inputColumnIds?: string[] | null;
  useOnlyRelevant?: boolean;
}

interface ColumnsPinEditorProps {
  columns: ColumnForPin[];
  onPinChange: (columnId: string, pinned: "left" | "right" | null) => Promise<void>;
  onVisibilityChange?: (columnId: string, visible: boolean) => Promise<void>;
  /** Al hacer clic en "Editar prompt" en una columna IA */
  onEditAIColumn?: (columnId: string) => void;
  onClose?: () => void;
}

export function ColumnsPinEditor({
  columns,
  onPinChange,
  onVisibilityChange,
  onEditAIColumn,
  onClose,
}: ColumnsPinEditorProps) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<Record<string, "left" | "right" | null>>({});
  const [loading, setLoading] = useState(false);
  const [visibilityLoading, setVisibilityLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const getPinned = (col: ColumnForPin) =>
    col.id in pending ? pending[col.id] : (col.pinned ?? null);

  const hasChanges = Object.keys(pending).length > 0;

  const handleSave = async () => {
    setLoading(true);
    try {
      for (const [colId, pinned] of Object.entries(pending)) {
        await onPinChange(colId, pinned);
      }
      setPending({});
      setOpen(false);
      onClose?.();
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityChange = async (col: ColumnForPin, visible: boolean) => {
    if (!onVisibilityChange) return;
    const isPinned = getPinned(col) === "left" || getPinned(col) === "right";
    if (!visible && isPinned) {
      const ok = confirm(
        "La columna está fijada. Se desfijará y se ocultará. ¿Continuar?"
      );
      if (!ok) return;
      setPending((prev) => ({ ...prev, [col.id]: null }));
      await onPinChange(col.id, null);
    }
    setVisibilityLoading(col.id);
    try {
      await onVisibilityChange(col.id, visible);
      onClose?.();
    } finally {
      setVisibilityLoading(null);
    }
  };

  const handleShowAll = async () => {
    if (!onVisibilityChange) return;
    setBulkLoading(true);
    try {
      await Promise.all(
        columns.map((col) => (col.hidden ? onVisibilityChange(col.id, true) : Promise.resolve()))
      );
      onClose?.();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleHideAll = async () => {
    if (!onVisibilityChange) return;
    const pinnedCount = columns.filter(
      (col) => getPinned(col) === "left" || getPinned(col) === "right"
    ).length;
    if (pinnedCount > 0) {
      const ok = confirm(
        `${pinnedCount} columna(s) están fijadas; se desfijarán y ocultarán. ¿Continuar?`
      );
      if (!ok) return;
      for (const col of columns) {
        const p = getPinned(col);
        if (p === "left" || p === "right") {
          setPending((prev) => ({ ...prev, [col.id]: null }));
          await onPinChange(col.id, null);
        }
      }
    }
    setBulkLoading(true);
    try {
      await Promise.all(
        columns.map((col) => onVisibilityChange(col.id, false))
      );
      setPending({});
      onClose?.();
    } finally {
      setBulkLoading(false);
    }
  };

  const handleInvertVisibility = async () => {
    if (!onVisibilityChange) return;
    const toHide = columns.filter((col) => !col.hidden);
    const pinnedToHide = toHide.filter(
      (col) => getPinned(col) === "left" || getPinned(col) === "right"
    );
    if (pinnedToHide.length > 0) {
      const ok = confirm(
        `${pinnedToHide.length} columna(s) visibles están fijadas; se desfijarán y ocultarán. ¿Continuar?`
      );
      if (!ok) return;
      for (const col of pinnedToHide) {
        setPending((prev) => ({ ...prev, [col.id]: null }));
        await onPinChange(col.id, null);
      }
    }
    setBulkLoading(true);
    try {
      await Promise.all(
        columns.map((col) => onVisibilityChange(col.id, !!col.hidden))
      );
      setPending({});
      onClose?.();
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Editar columnas
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar columnas</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-600">
          Fija columnas al scroll y muestra u oculta columnas. Los cambios de ancho al redimensionar se guardan automáticamente.
        </p>

        {onVisibilityChange && columns.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3">
            <span className="text-xs font-medium text-zinc-500 mr-1">Acciones:</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleShowAll}
              disabled={bulkLoading || columns.every((c) => !c.hidden)}
            >
              Mostrar todas
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleHideAll}
              disabled={bulkLoading || columns.every((c) => c.hidden)}
            >
              Ocultar todas
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleInvertVisibility}
              disabled={bulkLoading}
            >
              Invertir
            </Button>
          </div>
        )}

        <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
          {columns.map((col) => (
            <div key={col.id} className="flex items-center justify-between gap-4">
              <Label className="flex-1 truncate text-sm font-normal">{col.header}</Label>
              <div className="flex items-center gap-2 flex-wrap justify-end">
                {col.type === "ai" && onEditAIColumn && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      onEditAIColumn(col.id);
                      setOpen(false);
                    }}
                  >
                    Editar prompt
                  </Button>
                )}
                {onVisibilityChange && (
                  <div className="flex items-center gap-1.5">
                    <Switch
                      checked={!col.hidden}
                      disabled={visibilityLoading === col.id}
                      onCheckedChange={(checked) =>
                        handleVisibilityChange(col, checked)
                      }
                    />
                    <span className="text-xs text-zinc-600 w-12">Visible</span>
                  </div>
                )}
                <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
                  <Button
                    type="button"
                    variant={getPinned(col) === "left" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Fijar a la izquierda"
                    onClick={() =>
                      setPending((prev) => ({
                        ...prev,
                        [col.id]: getPinned(col) === "left" ? null : "left",
                      }))
                    }
                  >
                    <span className="flex items-center gap-0.5">
                      <Pin className="h-3 w-3" />
                      <ArrowLeft className="h-3 w-3" />
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant={getPinned(col) === "right" ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="Fijar a la derecha"
                    onClick={() =>
                      setPending((prev) => ({
                        ...prev,
                        [col.id]: getPinned(col) === "right" ? null : "right",
                      }))
                    }
                  >
                    <span className="flex items-center gap-0.5">
                      <Pin className="h-3 w-3" />
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </Button>
                  <Button
                    type="button"
                    variant={!getPinned(col) ? "secondary" : "ghost"}
                    size="sm"
                    className="h-7 w-7 p-0"
                    title="No fijar"
                    onClick={() =>
                      setPending((prev) => ({ ...prev, [col.id]: null }))
                    }
                  >
                    <PinOff className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !hasChanges}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
