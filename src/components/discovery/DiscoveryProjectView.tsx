"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AnalysisCanvas } from "./AnalysisCanvas";
import { DiscoveryReportChat } from "./DiscoveryReportChat";
import type { ReportContent } from "@/types/discovery";

async function fetchProject(projectId: string) {
  const res = await fetch(`/api/discovery/projects/${projectId}`);
  if (!res.ok) throw new Error("Project not found");
  return res.json();
}

export function DiscoveryProjectView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { data: project, isLoading, error } = useQuery({
    queryKey: ["discovery-project", projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8">
        <p className="text-red-600">Proyecto no encontrado</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/discovery")}>
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b border-zinc-200 bg-white px-6 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/discovery/new")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-zinc-600" />
          <h1 className="text-lg font-semibold text-zinc-900">{project.name}</h1>
        </div>
      </div>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-1/2 min-w-0 flex flex-col overflow-hidden">
          <DiscoveryReportChat projectId={project.id} />
        </div>
        <div className="w-1/2 min-w-0 flex flex-col overflow-hidden">
          <AnalysisCanvas report={project.report as ReportContent | null} />
        </div>
      </div>
    </div>
  );
}
