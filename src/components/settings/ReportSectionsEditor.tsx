"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, GripVertical } from "lucide-react";
import type { ReportSection } from "@/types/settings";

interface ReportSectionsEditorProps {
  sections: ReportSection[];
  onChange: (sections: ReportSection[]) => void;
}

function generateId() {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ReportSectionsEditor({ sections, onChange }: ReportSectionsEditorProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const addSection = () => {
    onChange([
      ...sections,
      { id: generateId(), name: "Nueva sección", prompt: "Describe qué debe incluir esta sección." },
    ]);
  };

  const updateSection = (id: string, updates: Partial<ReportSection>) => {
    onChange(
      sections.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  };

  const removeSection = (id: string) => {
    onChange(sections.filter((s) => s.id !== id));
  };

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggingId(sectionId);
    e.dataTransfer.setData("text/plain", sectionId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggingId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, dropSectionId: string) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === dropSectionId) {
      setDraggingId(null);
      return;
    }
    const fromIndex = sections.findIndex((s) => s.id === draggedId);
    const toIndex = sections.findIndex((s) => s.id === dropSectionId);
    if (fromIndex === -1 || toIndex === -1) {
      setDraggingId(null);
      return;
    }
    const newSections = [...sections];
    const [removed] = newSections.splice(fromIndex, 1);
    newSections.splice(toIndex, 0, removed);
    onChange(newSections);
    setDraggingId(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label>Secciones del informe</Label>
          <p className="text-xs text-zinc-500 mt-1">
            Cada sección tiene un prompt que el LLM usará para generar el análisis. Arrastra el asa para reordenar.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSection}>
          <Plus className="h-4 w-4 mr-1" />
          Añadir sección
        </Button>
      </div>
      <div className="space-y-4">
        {sections.map((section, idx) => (
          <div
            key={section.id}
            className={`rounded-lg border bg-white p-4 space-y-3 transition-opacity ${
              draggingId === section.id ? "opacity-50 border-zinc-400" : "border-zinc-200"
            }`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, section.id)}
          >
            <div className="flex items-center justify-between gap-2">
              <div
                className="cursor-grab active:cursor-grabbing touch-none text-zinc-400 hover:text-zinc-600 p-1 -ml-1 rounded hover:bg-zinc-100"
                draggable
                onDragStart={(e) => handleDragStart(e, section.id)}
                onDragEnd={handleDragEnd}
                title="Arrastra para reordenar"
              >
                <GripVertical className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium text-zinc-500 flex-1">Sección {idx + 1}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeSection(section.id)}
                className="text-zinc-500 hover:text-red-600 h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div>
              <Label className="text-xs">Nombre</Label>
              <Input
                placeholder="Ej: Resumen Ejecutivo"
                value={section.name}
                onChange={(e) => updateSection(section.id, { name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Prompt para el LLM</Label>
              <Textarea
                placeholder="Instrucciones específicas para esta sección..."
                value={section.prompt}
                onChange={(e) => updateSection(section.id, { prompt: e.target.value })}
                className="mt-1 min-h-[80px]"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
