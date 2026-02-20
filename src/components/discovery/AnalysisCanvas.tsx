"use client";

import type { ReportContent } from "@/types/discovery";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ReportSectionDisplay } from "./ReportSection";

interface AnalysisCanvasProps {
  report: ReportContent | null;
  isLoading?: boolean;
}

export function AnalysisCanvas({ report, isLoading }: AnalysisCanvasProps) {
  if (isLoading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50/50 p-8">
        <LoadingSpinner />
        <p className="text-sm text-zinc-600">Analizando sector con el LLM...</p>
        <p className="text-xs text-zinc-500">Esto puede tardar unos minutos</p>
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
    <div className="flex-1 overflow-auto bg-white p-8">
      <div className="mx-auto max-w-3xl">
        {report.map((section, idx) => (
          <ReportSectionDisplay key={idx} section={section} />
        ))}
      </div>
    </div>
  );
}
