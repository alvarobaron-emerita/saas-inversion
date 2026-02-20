"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { useToolStore } from "@/stores/toolStore";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const setActiveTool = useToolStore((s) => s.setActiveTool);

  useEffect(() => {
    if (pathname?.startsWith("/discovery")) setActiveTool("discovery");
    else if (pathname?.startsWith("/search")) setActiveTool("search");
  }, [pathname, setActiveTool]);

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
