"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AnalysisCanvas } from "./AnalysisCanvas";
import type { ReportContent } from "@/types/discovery";

export function DiscoveryNewAnalysis() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [sector, setSector] = useState("");
  const [context, setContext] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [report, setReport] = useState<ReportContent | null>(null);

  const handleAnalyze = async () => {
    if (!sector.trim()) return;

    setIsAnalyzing(true);
    setReport(null);

    try {
      const createRes = await fetch("/api/discovery/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: sector.slice(0, 50) || "Nuevo análisis",
          sector: sector.trim(),
          context: context.trim() || undefined,
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.error || "Error creando proyecto");
      }

      const project = await createRes.json();

      const analyzeRes = await fetch("/api/discovery/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id }),
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json();
        throw new Error(err.error || "Error en el análisis");
      }

      const { report: newReport } = await analyzeRes.json();
      setReport(newReport);
      queryClient.invalidateQueries({ queryKey: ["discovery-projects"] });
      router.push(`/discovery/${project.id}`);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Error en el análisis";
      alert(`Error: ${msg}. Comprueba que GEMINI_API_KEY esté configurada.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex w-[400px] shrink-0 flex-col gap-6 border-r border-zinc-200 bg-white p-6">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-zinc-600" />
            <h1 className="text-lg font-semibold text-zinc-900">Sectores</h1>
          </div>
          <p className="mt-1 text-sm text-zinc-500">Copiloto de Inversión</p>
        </div>
        <div className="space-y-4">
          <div>
            <Label htmlFor="sector">Sector o empresa</Label>
            <Input
              id="sector"
              placeholder="Ej: Mantenimiento de ascensores o Tecnotrash"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="mt-1"
              disabled={isAnalyzing}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Puedes escribir el nombre de un sector/nicho o de una empresa. En el
              contexto indica si es una empresa para analizar su sector.
            </p>
          </div>
          <div>
            <Label htmlFor="context">Contexto adicional (opcional)</Label>
            <Textarea
              id="context"
              placeholder="Ej: Es una empresa, quiero analizar su sector o Centrarse en mantenimiento, no instalación"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="mt-1 min-h-[80px]"
              disabled={isAnalyzing}
            />
          </div>
        </div>
        <Button
          className="mt-auto w-full"
          size="lg"
          onClick={handleAnalyze}
          disabled={!sector.trim() || isAnalyzing}
        >
          {isAnalyzing ? "Analizando..." : "ARRANCAR ANÁLISIS"}
        </Button>
      </div>
      <AnalysisCanvas report={report} isLoading={isAnalyzing} />
    </div>
  );
}
