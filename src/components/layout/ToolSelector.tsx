"use client";

import { useToolStore, type Tool } from "@/stores/toolStore";
import { cn } from "@/lib/utils";
import { Zap, Search } from "lucide-react";

const tools: { id: Tool; label: string; icon: React.ReactNode; description: string }[] = [
  { id: "discovery", label: "Sectores", icon: <Zap className="h-4 w-4" />, description: "Descubre nuevas oportunidades" },
  { id: "search", label: "Empresas", icon: <Search className="h-4 w-4" />, description: "Gestiona y analiza datos" },
];

export function ToolSelector() {
  const { activeTool, setActiveTool } = useToolStore();

  return (
    <div className="space-y-1">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => setActiveTool(tool.id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
            activeTool === tool.id
              ? "bg-zinc-100 text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          )}
        >
          <span className="text-zinc-500">{tool.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{tool.label}</div>
            <div className="text-xs text-zinc-500 truncate">{tool.description}</div>
          </div>
          {activeTool === tool.id && (
            <span className="text-zinc-500">✓</span>
          )}
        </button>
      ))}
    </div>
  );
}
