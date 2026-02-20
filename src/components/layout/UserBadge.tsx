"use client";

import { User } from "lucide-react";

export function UserBadge() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50/50 px-3 py-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-200 text-zinc-600">
        <User className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-zinc-900">Usuario</div>
        <div className="truncate text-xs text-zinc-500">usuario@example.com</div>
      </div>
    </div>
  );
}
