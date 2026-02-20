"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ThesisEditor } from "@/components/settings/ThesisEditor";
import { KPIConfig } from "@/components/settings/KPIConfig";
import { ReportSectionsEditor } from "@/components/settings/ReportSectionsEditor";
import type { SettingsData } from "@/types/settings";

async function fetchSettings(): Promise<SettingsData> {
  const res = await fetch("/api/settings");
  if (!res.ok) throw new Error("Error loading settings");
  return res.json();
}

async function saveSettings(data: SettingsData) {
  const res = await fetch("/api/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Error saving settings");
  return res.json();
}

export function DiscoverySettings() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
  });

  const [formData, setFormData] = useState<SettingsData | null>(null);

  useEffect(() => {
    if (data) setFormData(data);
  }, [data]);

  const mutation = useMutation({
    mutationFn: saveSettings,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });

  if (isLoading) return <div className="p-8">Cargando...</div>;
  if (error || !data) return <div className="p-8 text-red-600">Error cargando ajustes</div>;
  if (!formData) return null;

  const handleSave = () => {
    mutation.mutate(formData);
  };

  return (
    <div className="flex flex-col gap-8 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Ajustes</h1>
          <p className="mt-1 text-zinc-500">
            Configura la tesis, KPIs y secciones del informe
          </p>
        </div>
        <Button onClick={handleSave} disabled={mutation.isPending}>
          {mutation.isPending ? "Guardando..." : "Guardar"}
        </Button>
      </div>

      <div className="space-y-8">
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <div className="space-y-6">
            <ThesisEditor
              value={formData.thesis}
              onChange={(thesis) => setFormData((prev) => prev ? { ...prev, thesis } : prev)}
            />
            <div className="border-t border-zinc-200 pt-6">
              <KPIConfig
                kpis={formData.kpis}
                onChange={(kpis) => setFormData((prev) => prev ? { ...prev, kpis } : prev)}
              />
            </div>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white p-6">
          <ReportSectionsEditor
            sections={formData.reportSections}
            onChange={(reportSections) => setFormData((prev) => prev ? { ...prev, reportSections } : prev)}
          />
        </div>
      </div>
    </div>
  );
}
