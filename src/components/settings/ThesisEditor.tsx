"use client";

import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ThesisEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function ThesisEditor({ value, onChange }: ThesisEditorProps) {
  return (
    <div className="space-y-2">
      <Label>Tesis</Label>
      <Textarea
        placeholder="Describe el target de empresas que quieres comprar: tamaño de ventas, antigüedad, sector, etc."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[120px]"
      />
      <p className="text-xs text-zinc-500">
        Esta tesis guiará el análisis del LLM para evaluar si el sector encaja con tus criterios.
      </p>
    </div>
  );
}
