"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/discovery/projects/${project.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      queryClient.invalidateQueries({ queryKey: ["discovery-project", project.id] });
      queryClient.invalidateQueries({ queryKey: ["discovery-projects"] });
      setDeleteDialogOpen(false);
      router.push("/discovery/new");
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar el proyecto.");
    } finally {
      setIsDeleting(false);
    }
  };

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
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Zap className="h-5 w-5 shrink-0 text-zinc-600" />
          <h1 className="text-lg font-semibold text-zinc-900 truncate">{project.name}</h1>
        </div>
      </div>
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar proyecto</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-600">
            ¿Eliminar este proyecto? No se puede deshacer.
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="w-1/2 min-w-0 flex flex-col overflow-hidden">
          <DiscoveryReportChat projectId={project.id} />
        </div>
        <div className="w-1/2 min-w-0 flex flex-col overflow-hidden">
          <AnalysisCanvas
            report={project.report as ReportContent | null}
            projectId={project.id}
            onDeleteClick={() => setDeleteDialogOpen(true)}
            onReportSave={async (report) => {
              const res = await fetch(`/api/discovery/projects/${project.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ report }),
              });
              if (!res.ok) throw new Error("Error guardando el informe");
              queryClient.invalidateQueries({ queryKey: ["discovery-project", project.id] });
            }}
          />
        </div>
      </div>
    </div>
  );
}
