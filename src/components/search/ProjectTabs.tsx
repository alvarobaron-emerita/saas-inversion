"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface SearchViewItem {
  id: string;
  name: string;
  sortOrder: number;
}

interface ProjectTabsProps {
  projectId: string;
  views: SearchViewItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  counts: Record<string, number>;
  onViewCreated?: (newViewId: string) => void;
  loading?: boolean;
}

export function ProjectTabs({
  projectId,
  views,
  activeTab,
  onTabChange,
  counts,
  onViewCreated,
  loading = false,
}: ProjectTabsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreateView = async () => {
    if (!newViewName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/search/projects/${projectId}/views`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newViewName.trim() }),
      });
      if (!res.ok) throw new Error("Error");
      const view = await res.json();
      setDialogOpen(false);
      setNewViewName("");
      onViewCreated?.(view.id);
    } catch {
      alert("Error al crear la vista");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1 border-b border-zinc-200">
        <button
          onClick={() => onTabChange("inbox")}
          className={cn(
            "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "inbox"
              ? "border-zinc-900 text-zinc-900"
              : "border-transparent text-zinc-600 hover:text-zinc-900"
          )}
        >
          Bandeja de Entrada
          {counts["inbox"] != null && (
            <span
              className={cn(
                "ml-2 rounded-full px-2 py-0.5 text-xs",
                activeTab === "inbox" ? "bg-zinc-200" : "bg-zinc-100"
              )}
            >
              {counts["inbox"]}
            </span>
          )}
        </button>
        {views.map((view) => (
          <button
            key={view.id}
            onClick={() => onTabChange(view.id)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
              activeTab === view.id
                ? "border-zinc-900 text-zinc-900"
                : "border-transparent text-zinc-600 hover:text-zinc-900"
            )}
          >
            {view.name}
            {counts[view.id] != null && (
              <span
                className={cn(
                  "ml-2 rounded-full px-2 py-0.5 text-xs",
                  activeTab === view.id ? "bg-zinc-200" : "bg-zinc-100"
                )}
              >
                {counts[view.id]}
              </span>
            )}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-2 -mb-px text-zinc-600 hover:text-zinc-900"
          onClick={() => setDialogOpen(true)}
          disabled={loading}
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva Vista
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nueva vista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <label className="text-sm font-medium text-zinc-700">
              Nombre de la vista
            </label>
            <Input
              placeholder="Ej: Shortlist, Descartados"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateView()}
            />
          </div>
          <Button
            onClick={handleCreateView}
            disabled={creating || !newViewName.trim()}
          >
            {creating ? "Creando..." : "Crear"}
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
