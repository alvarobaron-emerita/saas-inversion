"use client";

import { useState, useMemo, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Settings2, Pin, PinOff, ArrowLeft, ArrowRight, GripVertical, Search } from "lucide-react";

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

const BULK_CHUNK_SIZE = 15;

interface ColumnsPinEditorProps {
  columns: ColumnForPin[];
  onPinChange: (
    columnId: string,
    pinned: "left" | "right" | null,
    options?: { skipRefetch?: boolean }
  ) => Promise<void>;
  onVisibilityChange?: (
    columnId: string,
    visible: boolean,
    options?: { skipRefetch?: boolean }
  ) => Promise<void>;
  /** Al hacer clic en "Editar prompt" en una columna IA */
  onEditAIColumn?: (columnId: string) => void;
  /** Al guardar un nuevo orden de columnas (array de ids en el orden deseado) */
  onOrderChange?: (orderedColumnIds: string[], options?: { skipRefetch?: boolean }) => Promise<void>;
  onClose?: () => void | Promise<void>;
  /** Se llama al abrir el diálogo; si devuelve una promesa, el contenido no se muestra hasta que se resuelva (para refrescar orden desde servidor). */
  onOpen?: () => void | Promise<void>;
}

export function ColumnsPinEditor({
  columns,
  onPinChange,
  onVisibilityChange,
  onEditAIColumn,
  onOrderChange,
  onClose,
  onOpen,
}: ColumnsPinEditorProps) {
  const [open, setOpen] = useState(false);
  const [syncingColumns, setSyncingColumns] = useState(false);
  const [pending, setPending] = useState<Record<string, "left" | "right" | null>>({});
  const [pendingVisibility, setPendingVisibility] = useState<Record<string, boolean>>({});
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !onOpen) return;
    let cancelled = false;
    (async () => {
      setSyncingColumns(true);
      try {
        await Promise.resolve(onOpen());
      } finally {
        if (!cancelled) setSyncingColumns(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, onOpen]);

  const getPinned = (col: ColumnForPin) =>
    col.id in pending ? pending[col.id] : (col.pinned ?? null);

  const getVisible = (col: ColumnForPin) =>
    col.id in pendingVisibility ? pendingVisibility[col.id] : !col.hidden;

  const orderedIds = useMemo(() => pendingOrder ?? columns.map((c) => c.id), [pendingOrder, columns]);
  const displayColumns = useMemo(() => {
    const byId = new Map(columns.map((c) => [c.id, c]));
    return orderedIds.map((id) => byId.get(id)).filter(Boolean) as ColumnForPin[];
  }, [columns, orderedIds]);

  const filteredColumns = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return displayColumns;
    return displayColumns.filter(
      (col) =>
        col.header.toLowerCase().includes(q) || col.id.toLowerCase().includes(q)
    );
  }, [displayColumns, searchQuery]);

  const orderChanged =
    pendingOrder !== null &&
    (pendingOrder.length !== columns.length ||
      pendingOrder.some((id, i) => columns[i]?.id !== id));

  const hasChanges =
    Object.keys(pending).length > 0 ||
    Object.keys(pendingVisibility).length > 0 ||
    orderChanged;

  const handleCancel = () => {
    setPending({});
    setPendingVisibility({});
    setPendingOrder(null);
    setSearchQuery("");
    setSaveError(null);
    setOpen(false);
  };

  const handleSave = async () => {
    if (!hasChanges) return;
    setLoading(true);
    setSaveError(null);
    try {
      const pinPromises = Object.entries(pending).map(([colId, pinned]) =>
        onPinChange(colId, pinned, { skipRefetch: true })
      );
      const visibilityPromise = onVisibilityChange
        ? (async () => {
            const updates = Object.entries(pendingVisibility).map(([id, visible]) => ({ id, visible }));
            for (let i = 0; i < updates.length; i += BULK_CHUNK_SIZE) {
              const chunk = updates.slice(i, i + BULK_CHUNK_SIZE);
              await Promise.all(
                chunk.map(({ id, visible }) =>
                  onVisibilityChange!(id, visible, { skipRefetch: true })
                )
              );
            }
          })()
        : Promise.resolve();
      const columnIdSet = new Set(columns.map((c) => c.id));
      const orderIsComplete =
        orderedIds.length === columns.length &&
        orderedIds.every((id) => columnIdSet.has(id)) &&
        new Set(orderedIds).size === orderedIds.length;
      const orderPromise =
        orderChanged && onOrderChange && orderIsComplete
          ? onOrderChange(orderedIds, { skipRefetch: true })
          : Promise.resolve();
      await Promise.all([...pinPromises, visibilityPromise, orderPromise]);
      await Promise.resolve(onClose?.());
      setPending({});
      setPendingVisibility({});
      setPendingOrder(null);
      setSearchQuery("");
      setOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al guardar";
      setSaveError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityToggle = (col: ColumnForPin, visible: boolean) => {
    if (!visible && (getPinned(col) === "left" || getPinned(col) === "right")) {
      setPending((prev) => ({ ...prev, [col.id]: null }));
    }
    setPendingVisibility((prev) => ({ ...prev, [col.id]: visible }));
  };

  const handleShowAll = () => {
    const next: Record<string, boolean> = {};
    columns.forEach((col) => {
      if (!getVisible(col)) next[col.id] = true;
    });
    setPendingVisibility((prev) => ({ ...prev, ...next }));
  };

  const handleHideAll = () => {
    const nextVis: Record<string, boolean> = {};
    const nextPin: Record<string, "left" | "right" | null> = {};
    columns.forEach((col) => {
      nextVis[col.id] = false;
      if (getPinned(col) === "left" || getPinned(col) === "right") nextPin[col.id] = null;
    });
    setPendingVisibility((prev) => ({ ...prev, ...nextVis }));
    setPending((prev) => ({ ...prev, ...nextPin }));
  };

  const handleInvertVisibility = () => {
    const nextVis: Record<string, boolean> = {};
    const nextPin: Record<string, "left" | "right" | null> = {};
    columns.forEach((col) => {
      const newVisible = !getVisible(col);
      nextVis[col.id] = newVisible;
      if (!newVisible && (getPinned(col) === "left" || getPinned(col) === "right")) {
        nextPin[col.id] = null;
      }
    });
    setPendingVisibility((prev) => ({ ...prev, ...nextVis }));
    setPending((prev) => ({ ...prev, ...nextPin }));
  };

  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggingId(columnId);
    e.dataTransfer.setData("text/plain", columnId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropColumnId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === dropColumnId) {
      setDraggingId(null);
      return;
    }
    const current = pendingOrder ?? columns.map((c) => c.id);
    const fromIndex = current.indexOf(draggedId);
    const toIndex = current.indexOf(dropColumnId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      return;
    }
    const next = [...current];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    setPendingOrder(next);
    setDraggingId(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) setSyncingColumns(true);
    else setSyncingColumns(false);
    setOpen(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
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
        {syncingColumns ? (
          <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
            Cargando columnas…
          </div>
        ) : (
          <>
        <p className="text-sm text-zinc-600">
          Arrastra para reordenar; fija columnas al scroll y muestra u oculta columnas. Los cambios de orden, visibilidad y fijado se aplican al pulsar Guardar. El ancho al redimensionar en la tabla se guarda automáticamente.
        </p>

        {onVisibilityChange && columns.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-3">
            <span className="text-xs font-medium text-zinc-500 mr-1">Acciones:</span>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleShowAll}
              disabled={columns.every((c) => getVisible(c))}
            >
              Mostrar todas
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleHideAll}
              disabled={columns.every((c) => !getVisible(c))}
            >
              Ocultar todas
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handleInvertVisibility}
            >
              Invertir
            </Button>
          </div>
        )}

        {columns.length > 3 && (
          <div className="relative border-b border-zinc-200 pb-3">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              type="search"
              placeholder="Buscar columna por nombre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
              aria-label="Buscar columna"
            />
          </div>
        )}

        <div className="space-y-3 py-4 max-h-[60vh] overflow-y-auto">
          {filteredColumns.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4 text-center">
              {searchQuery.trim() ? "Ninguna columna coincide con la búsqueda." : "No hay columnas."}
            </p>
          ) : (
            filteredColumns.map((col) => (
            <div
              key={col.id}
              className={`flex items-center justify-between gap-2 rounded-md border transition-opacity ${
                draggingId === col.id ? "opacity-50 border-zinc-400 bg-zinc-50" : "border-transparent"
              }`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {onOrderChange && !searchQuery.trim() && (
                <div
                  className="cursor-grab active:cursor-grabbing touch-none text-zinc-400 hover:text-zinc-600 p-1 rounded hover:bg-zinc-100 shrink-0"
                  draggable
                  onDragStart={(e) => handleDragStart(e, col.id)}
                  onDragEnd={handleDragEnd}
                  title="Arrastra para reordenar (borra la búsqueda para reordenar)"
                >
                  <GripVertical className="h-4 w-4" />
                </div>
              )}
              {onOrderChange && searchQuery.trim() && (
                <div className="shrink-0 w-6 h-4 flex items-center justify-center text-zinc-300" title="Borrar búsqueda para reordenar">
                  <GripVertical className="h-4 w-4" />
                </div>
              )}
              <Label className="flex-1 truncate text-sm font-normal min-w-0">{col.header}</Label>
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
                      checked={getVisible(col)}
                      onCheckedChange={(checked) => handleVisibilityToggle(col, checked)}
                    />
                    <span className="text-xs text-zinc-600 w-12">Visible</span>
                  </div>
                )}
                <div className="flex items-center rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
                  <Button
                    type="button"
                    variant={getPinned(col) === "left" ? "default" : "ghost"}
                    size="sm"
                    className={`h-7 w-7 p-0 ${getPinned(col) === "left" ? "bg-zinc-800 text-zinc-50 hover:bg-zinc-700" : ""}`}
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
                    variant={getPinned(col) === "right" ? "default" : "ghost"}
                    size="sm"
                    className={`h-7 w-7 p-0 ${getPinned(col) === "right" ? "bg-zinc-800 text-zinc-50 hover:bg-zinc-700" : ""}`}
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
                    variant={!getPinned(col) ? "default" : "ghost"}
                    size="sm"
                    className={`h-7 w-7 p-0 ${!getPinned(col) ? "bg-zinc-800 text-zinc-50 hover:bg-zinc-700" : ""}`}
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
            )))}
        </div>
        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {saveError}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || !hasChanges}>
            {loading ? "Guardando..." : "Guardar"}
          </Button>
        </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
