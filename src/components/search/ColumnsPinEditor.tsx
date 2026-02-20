"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings2 } from "lucide-react";

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

  const getPinned = (col: ColumnForPin) =>
    col.id in pending ? pending[col.id] : (col.pinned ?? null);

  const hasChanges = Object.keys(pending).length > 0;

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
          <DialogTitle>Fijar columnas</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-600">
          Fija columnas al scroll y muestra u oculta columnas. Los cambios de ancho al redimensionar se guardan automáticamente.
        </p>
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
                  <label className="flex items-center gap-1.5 text-sm text-zinc-600">
                    <input
                      type="checkbox"
                      checked={!col.hidden}
                      disabled={visibilityLoading === col.id}
                      onChange={async () => {
                        setVisibilityLoading(col.id);
                        try {
                          await onVisibilityChange(col.id, !!col.hidden);
                          onClose?.();
                        } finally {
                          setVisibilityLoading(null);
                        }
                      }}
                      className="h-4 w-4 rounded border-zinc-300"
                    />
                    Visible
                  </label>
                )}
                <select
                  value={getPinned(col) ?? ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    setPending((prev) => ({
                      ...prev,
                      [col.id]: (v === "" ? null : v) as "left" | "right" | null,
                    }));
                  }}
                  className="h-9 w-[140px] rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm"
                >
                  <option value="">No fijar</option>
                  <option value="left">Fijar a la izquierda</option>
                  <option value="right">Fijar a la derecha</option>
                </select>
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
