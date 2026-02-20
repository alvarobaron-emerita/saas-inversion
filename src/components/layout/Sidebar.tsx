"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useToolStore } from "@/stores/toolStore";
import { ToolSelector } from "./ToolSelector";
import { UserBadge } from "./UserBadge";
import { DiscoveryProjectList } from "@/components/discovery/DiscoveryProjectList";
import { SearchProjectList } from "@/components/search/SearchProjectList";
import { Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { activeTool } = useToolStore();

  const isDiscovery = activeTool === "discovery";
  const basePath = isDiscovery ? "/discovery" : "/search";

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-200 bg-white">
      <div className="flex flex-col gap-4 p-4 overflow-y-auto">
        <div>
          <h2 className="mb-3 px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Herramienta
          </h2>
          <ToolSelector />
        </div>

        {isDiscovery && <DiscoveryProjectList />}
        {!isDiscovery && <SearchProjectList />}

        <nav className="space-y-1">
          <h2 className="px-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Navegación
          </h2>
          <Link
            href={`${basePath}/new`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              pathname === `${basePath}/new` || (pathname?.startsWith(`${basePath}/`) && !pathname?.includes("/settings") && pathname !== basePath)
                ? "bg-zinc-100 font-medium text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <Plus className="h-4 w-4" />
            {isDiscovery ? "Nuevo análisis" : "Nuevo proyecto"}
          </Link>
          <Link
            href={`${basePath}/settings`}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              pathname?.includes("/settings")
                ? "bg-zinc-100 font-medium text-zinc-900"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
            )}
          >
            <Settings className="h-4 w-4" />
            Ajustes
          </Link>
        </nav>
      </div>

      <div className="mt-auto border-t border-zinc-200 p-4">
        <UserBadge />
      </div>
    </aside>
  );
}
