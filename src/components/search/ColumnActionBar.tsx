"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ColumnActionBarProps {
  selectedCount: number;
  onApplyWidth: (width: number) => Promise<void>;
  onApplyPin: (pinned: "left" | "right" | null) => Promise<void>;
  onAutoSizeContent?: () => void;
  onClearSelection: () => void;
}

export function ColumnActionBar({
  selectedCount,
  onApplyWidth,
  onApplyPin,
  onAutoSizeContent,
  onClearSelection,
}: ColumnActionBarProps) {
  const [widthInput, setWidthInput] = useState("");
  const [pinValue, setPinValue] = useState<"left" | "right" | "none" | "">("");
  const [loading, setLoading] = useState(false);

  const handleApplyWidth = async () => {
    const w = parseInt(widthInput, 10);
    if (Number.isNaN(w) || w < 50) return;
    setLoading(true);
    try {
      await onApplyWidth(w);
      setWidthInput("");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyPin = async () => {
    if (pinValue === "") return;
    setLoading(true);
    try {
      await onApplyPin(pinValue === "none" ? null : pinValue);
      setPinValue("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-4 border-b border-zinc-200 bg-zinc-50 px-4 py-2 text-sm">
      <span className="font-medium text-zinc-700">
        {selectedCount === 1
          ? "1 columna seleccionada"
          : `${selectedCount} columnas seleccionadas`}
      </span>
      <span className="text-zinc-500 text-xs">
        Ctrl+clic o ⌘+clic en encabezados para añadir o quitar
      </span>
      <span className="text-zinc-500">|</span>
      <div className="flex items-center gap-2">
        <label className="text-zinc-600">Ancho (px):</label>
        <Input
          type="number"
          min={50}
          placeholder="120"
          value={widthInput}
          onChange={(e) => setWidthInput(e.target.value)}
          className="h-8 w-24"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleApplyWidth}
          disabled={loading || !widthInput.trim()}
        >
          Aplicar
        </Button>
      </div>
      <span className="text-zinc-500">|</span>
      <div className="flex items-center gap-2">
        <label className="text-zinc-600">Fijar:</label>
        <select
          value={pinValue}
          onChange={(e) => setPinValue(e.target.value as "left" | "right" | "none" | "")}
          className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-sm"
        >
          <option value="">—</option>
          <option value="left">Izquierda</option>
          <option value="right">Derecha</option>
          <option value="none">No fijar</option>
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleApplyPin}
          disabled={loading || pinValue === ""}
        >
          Aplicar
        </Button>
      </div>
      {onAutoSizeContent && (
        <Button variant="outline" size="sm" onClick={onAutoSizeContent}>
          Ajustar al contenido
        </Button>
      )}
      <Button variant="ghost" size="sm" onClick={onClearSelection}>
        Deseleccionar
      </Button>
    </div>
  );
}
