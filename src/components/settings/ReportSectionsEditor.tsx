"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { ReportSection } from "@/types/settings";

interface ReportSectionsEditorProps {
  sections: ReportSection[];
  onChange: (sections: ReportSection[]) => void;
}

function generateId() {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const DEFAULT_SECTIONS: ReportSection[] = [
  { id: generateId(), name: "Resumen Ejecutivo", prompt: "Escribe un resumen ejecutivo del sector." },
  { id: generateId(), name: "Unit Economics y Financieros", prompt: "Analiza los unit economics y aspectos financieros típicos del sector." },
  { id: generateId(), name: "Tamaño y Segmentación", prompt: "Describe el tamaño del mercado y su segmentación." },
  { id: generateId(), name: "Cadena de Valor", prompt: "Explica la cadena de valor del sector." },
  { id: generateId(), name: "Estructura Competitiva", prompt: "Analiza la estructura competitiva." },
  { id: generateId(), name: "Regulación y Riesgos", prompt: "Identifica regulación relevante y riesgos." },
  { id: generateId(), name: "Oportunidades", prompt: "Señala oportunidades de inversión basadas en la tesis." },
];

export function ReportSectionsEditor({ sections, onChange }: ReportSectionsEditorProps) {
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

  const loadDefaults = () => {
    onChange(DEFAULT_SECTIONS.map((s) => ({ ...s, id: generateId() })));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label>Secciones del informe</Label>
          <p className="text-xs text-zinc-500 mt-1">
            Cada sección tiene un prompt que el LLM usará para generar el análisis.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={loadDefaults}>
            Cargar por defecto
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={addSection}>
            <Plus className="h-4 w-4 mr-1" />
            Añadir sección
          </Button>
        </div>
      </div>
      <div className="space-y-4">
        {sections.map((section, idx) => (
          <div
            key={section.id}
            className="rounded-lg border border-zinc-200 bg-white p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-zinc-500">Sección {idx + 1}</span>
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
