"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Folder } from "lucide-react";
import { cn } from "@/lib/utils";

async function fetchProjects() {
  const res = await fetch("/api/discovery/projects");
  if (!res.ok) throw new Error("Error loading projects");
  return res.json();
}

export function DiscoveryProjectList() {
  const pathname = usePathname();
  const { data: projects = [] } = useQuery({
    queryKey: ["discovery-projects"],
    queryFn: fetchProjects,
  });

  if (projects.length === 0) return null;

  return (
    <div className="space-y-1">
      <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        Proyectos
      </h2>
      {projects.slice(0, 8).map((p: { id: string; name: string }) => (
        <Link
          key={p.id}
          href={`/discovery/${p.id}`}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
            pathname === `/discovery/${p.id}`
              ? "bg-zinc-100 font-medium text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
          )}
        >
          <Folder className="h-4 w-4 shrink-0 text-zinc-400" />
          <span className="truncate">{p.name}</span>
        </Link>
      ))}
    </div>
  );
}
