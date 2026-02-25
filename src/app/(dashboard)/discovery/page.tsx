"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, Plus, Folder } from "lucide-react";
import { Button } from "@/components/ui/button";

async function fetchProjects() {
  const res = await fetch("/api/discovery/projects");
  if (!res.ok) throw new Error("Error loading projects");
  return res.json();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function createdByLabel(createdBy: { name?: string | null; email: string } | null) {
  if (!createdBy) return "—";
  return createdBy.name?.trim() || createdBy.email || "—";
}

export default function DiscoveryPage() {
  const router = useRouter();
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["discovery-projects"],
    queryFn: fetchProjects,
  });

  const recent = projects.slice(0, 10);
  const total = projects.length;

  return (
    <div className="flex h-full flex-col p-8">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="rounded-full bg-zinc-100 p-2">
              <Zap className="h-5 w-5 text-zinc-600" />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900">Sectores</h1>
          </div>
          <p className="text-zinc-500 max-w-md">
            Copiloto de Inversión. Crea un nuevo análisis de sector para descubrir oportunidades.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-5 py-4 min-w-[140px] shadow-sm">
            <div className="flex items-center gap-2 text-zinc-500 text-xs font-medium uppercase tracking-wider mb-1">
              <Zap className="h-3.5 w-3.5" />
              Total análisis
            </div>
            <p className="text-2xl font-bold text-zinc-900 tabular-nums">{isLoading ? "…" : total}</p>
          </div>
          <Button onClick={() => router.push("/discovery/new")} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo análisis
          </Button>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          <h2 className="px-4 py-3 text-sm font-medium text-zinc-700 border-b border-zinc-100">
            Análisis recientes
          </h2>
          {isLoading ? (
            <div className="p-8 text-center text-zinc-500 text-sm">Cargando…</div>
          ) : recent.length === 0 ? (
            <div className="p-8 text-center text-zinc-500 text-sm">
              No hay análisis. Crea uno desde el botón superior o desde la barra lateral.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 text-left text-zinc-500">
                    <th className="px-4 py-3 font-medium">Nombre</th>
                    <th className="px-4 py-3 font-medium">Sector</th>
                    <th className="px-4 py-3 font-medium">Creado</th>
                    <th className="px-4 py-3 font-medium">Creado por</th>
                    <th className="px-4 py-3 font-medium">Último análisis</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p: {
                    id: string;
                    name: string;
                    sector: string | null;
                    createdAt: string;
                    createdBy: { name?: string | null; email: string } | null;
                    lastAnalyzedAt: string | null;
                  }) => (
                    <tr key={p.id} className="border-b border-zinc-50 hover:bg-zinc-50/50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/discovery/${p.id}`}
                          className="font-medium text-zinc-900 hover:underline flex items-center gap-2"
                        >
                          <Folder className="h-4 w-4 text-zinc-400 shrink-0" />
                          {p.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-zinc-600">{p.sector ?? "—"}</td>
                      <td className="px-4 py-3 text-zinc-600">{formatDate(p.createdAt)}</td>
                      <td className="px-4 py-3 text-zinc-600">{createdByLabel(p.createdBy)}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {p.lastAnalyzedAt ? formatDate(p.lastAnalyzedAt) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
