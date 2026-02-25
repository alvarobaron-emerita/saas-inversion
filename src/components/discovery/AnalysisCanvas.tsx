"use client";

import { forwardRef, useState, useEffect, useImperativeHandle, useRef } from "react";
import type { ReportContent } from "@/types/discovery";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Textarea } from "@/components/ui/textarea";
import { Check, Circle, Loader2 } from "lucide-react";
import { ReportSectionDisplay } from "./ReportSection";

export type AnalysisProgress = {
  sectionNames?: string[];
  sectionName?: string;
  index: number;
  total: number;
};

export interface AnalysisCanvasRef {
  startEdit: () => void;
  save: () => Promise<void>;
}

interface AnalysisCanvasProps {
  report: ReportContent | null;
  isLoading?: boolean;
  progress?: AnalysisProgress | null;
  projectId?: string;
  onReportSave?: (report: ReportContent) => Promise<void>;
  onDeleteClick?: () => void;
  onEditingChange?: (isEditing: boolean) => void;
}

export const AnalysisCanvas = forwardRef<AnalysisCanvasRef, AnalysisCanvasProps>(function AnalysisCanvas(
  { report, isLoading, progress, onReportSave, onEditingChange },
  ref
) {
  const [isEditing, setIsEditing] = useState(false);
  const [localReport, setLocalReport] = useState<ReportContent | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- setIsSaving used in handleSave
  const [isSaving, setIsSaving] = useState(false);
  const onEditingChangeRef = useRef(onEditingChange);
  const startEditRef = useRef<() => void>(() => {});
  const saveRef = useRef<() => Promise<void>>(async () => {});
  onEditingChangeRef.current = onEditingChange;

  useEffect(() => {
    if (report && isEditing) {
      setLocalReport(report.map((s) => ({ ...s })));
    }
  }, [report, isEditing]);

  const handleStartEdit = () => {
    if (report) setLocalReport(report.map((s) => ({ ...s })));
    setIsEditing(true);
    onEditingChangeRef.current?.(true);
  };
  startEditRef.current = handleStartEdit;

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
      onEditingChangeRef.current?.(false);
    } catch (e) {
      console.error(e);
      alert("Error al guardar el informe.");
    } finally {
      setIsSaving(false);
    }
  };
  saveRef.current = handleSave;

  useImperativeHandle(ref, () => ({
    startEdit: () => startEditRef.current(),
    save: () => saveRef.current(),
  }), []);

  if (isLoading) {
    const names =
      progress?.sectionNames && progress.sectionNames.length > 0
        ? progress.sectionNames
        : progress
          ? Array.from({ length: progress.total }, (_, i) =>
              i === progress.index && progress.sectionName ? progress.sectionName : `Sección ${i + 1}`
            )
          : [];
    const showStepper = progress && names.length > 0;

    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50/50 p-8">
        <LoadingSpinner />
        <p className="text-sm text-zinc-600">Analizando sector con el LLM...</p>
        {showStepper ? (
          <div className="w-full max-w-sm space-y-1">
            <p className="text-xs text-zinc-500 mb-3 text-center">Esto puede tardar unos minutos</p>
            <ul className="space-y-0">
              {names.map((name, i) => {
                const done = i < progress!.index;
                const current = i === progress!.index;
                return (
                  <li
                    key={i}
                    className={`flex items-center gap-3 py-2 px-3 rounded-md transition-colors ${
                      current ? "bg-zinc-100 text-zinc-900" : done ? "text-zinc-600" : "text-zinc-400"
                    }`}
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs">
                      {done ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      ) : current ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-600 text-white">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        </span>
                      ) : (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-zinc-300 bg-white">
                          <Circle className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </span>
                    <span className={`text-sm truncate ${current ? "font-medium" : ""}`}>{name}</span>
                  </li>
                );
              })}
            </ul>
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
      <div className="flex-1 overflow-auto pt-4 px-8 pb-8">
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
});
