"use client";

import { useState, useEffect } from "react";
import type { ReportContent } from "@/types/discovery";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save } from "lucide-react";
import { ReportSectionDisplay } from "./ReportSection";

export type AnalysisProgress = {
  sectionName: string;
  index: number;
  total: number;
};

interface AnalysisCanvasProps {
  report: ReportContent | null;
  isLoading?: boolean;
  progress?: AnalysisProgress | null;
  projectId?: string;
  onReportSave?: (report: ReportContent) => Promise<void>;
}

export function AnalysisCanvas({ report, isLoading, progress, projectId, onReportSave }: AnalysisCanvasProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [localReport, setLocalReport] = useState<ReportContent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const canEdit = Boolean(projectId && onReportSave && report && report.length > 0);

  useEffect(() => {
    if (report && isEditing) {
      setLocalReport(report.map((s) => ({ ...s })));
    }
  }, [report, isEditing]);

  const handleStartEdit = () => {
    if (report) setLocalReport(report.map((s) => ({ ...s })));
    setIsEditing(true);
  };

  const handleSectionChange = (index: number, content: string) => {
    setLocalReport((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], content };
      return next;
    });
  };

  const handleSave = async () => {
    if (!localReport || !onReportSave) return;
    setIsSaving(true);
    try {
      await onReportSave(localReport);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert("Error al guardar el informe.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50/50 p-8">
        <LoadingSpinner />
        <p className="text-sm text-zinc-600">Analizando sector con el LLM...</p>
        {progress ? (
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-zinc-800">
              Sección {progress.index + 1} de {progress.total}: {progress.sectionName}
            </p>
            <div className="w-64 h-2 bg-zinc-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-600 transition-all duration-300"
                style={{ width: `${((progress.index + 1) / progress.total) * 100}%` }}
              />
            </div>
            <p className="text-xs text-zinc-500">Esto puede tardar unos minutos</p>
          </div>
        ) : (
          <p className="text-xs text-zinc-500">Esto puede tardar unos minutos</p>
        )}
      </div>
    );
  }

  if (!report || report.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50/50 p-8">
        <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
            <svg
              className="h-8 w-8 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-medium text-zinc-900">Lienzo de Análisis</h2>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            Configura el sector que deseas analizar en el panel izquierdo. El informe
            detallado aparecerá aquí con métricas, señales y empresas objetivo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-white">
      {canEdit && (
        <div className="flex items-center justify-end gap-2 border-b border-zinc-200 px-6 py-2 bg-zinc-50/50">
          {isEditing ? (
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              <Save className="h-4 w-4 mr-1" />
              {isSaving ? "Guardando..." : "Guardar"}
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleStartEdit}>
              <Pencil className="h-4 w-4 mr-1" />
              Editar informe
            </Button>
          )}
        </div>
      )}
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-3xl">
          {isEditing && localReport ? (
            localReport.map((section, idx) => (
              <div key={idx} className="mb-8">
                <h2 className="mb-2 text-lg font-semibold text-zinc-900 border-b border-zinc-200 pb-2">
                  {section.sectionName}
                </h2>
                <Textarea
                  value={section.content}
                  onChange={(e) => handleSectionChange(idx, e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </div>
            ))
          ) : (
            report.map((section, idx) => (
              <ReportSectionDisplay key={idx} section={section} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
