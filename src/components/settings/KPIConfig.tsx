"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import type { KPI } from "@/types/settings";

interface KPIConfigProps {
  kpis: KPI[];
  onChange: (kpis: KPI[]) => void;
}

function generateId() {
  return `kpi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function KPIConfig({ kpis, onChange }: KPIConfigProps) {
  const addKPI = () => {
    onChange([
      ...kpis,
      { id: generateId(), name: "", min: undefined, max: undefined, unit: "" },
    ]);
  };

  const updateKPI = (id: string, updates: Partial<KPI>) => {
    onChange(
      kpis.map((k) => (k.id === id ? { ...k, ...updates } : k))
    );
  };

  const removeKPI = (id: string) => {
    onChange(kpis.filter((k) => k.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>KPIs objetivo</Label>
        <Button type="button" variant="outline" size="sm" onClick={addKPI}>
          <Plus className="h-4 w-4 mr-1" />
          Añadir KPI
        </Button>
      </div>
      <p className="text-xs text-zinc-500">
        Define KPIs para verificar si el sector encaja (ej: facturación mínima, margen, etc.)
      </p>
      <div className="space-y-3">
        {kpis.map((kpi) => (
          <div
            key={kpi.id}
            className="flex flex-wrap items-end gap-3 rounded-lg border border-zinc-200 bg-zinc-50/50 p-3"
          >
            <div className="flex-1 min-w-[120px]">
              <Label className="text-xs">Nombre</Label>
              <Input
                placeholder="Ej: Facturación mínima"
                value={kpi.name}
                onChange={(e) => updateKPI(kpi.id, { name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div className="w-24">
              <Label className="text-xs">Mín</Label>
              <Input
                type="number"
                placeholder="Min"
                value={kpi.min ?? ""}
                onChange={(e) =>
                  updateKPI(kpi.id, {
                    min: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="mt-1"
              />
            </div>
            <div className="w-24">
              <Label className="text-xs">Máx</Label>
              <Input
                type="number"
                placeholder="Max"
                value={kpi.max ?? ""}
                onChange={(e) =>
                  updateKPI(kpi.id, {
                    max: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="mt-1"
              />
            </div>
            <div className="w-20">
              <Label className="text-xs">Unidad</Label>
              <Input
                placeholder="€, %"
                value={kpi.unit ?? ""}
                onChange={(e) => updateKPI(kpi.id, { unit: e.target.value })}
                className="mt-1"
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeKPI(kpi.id)}
              className="text-zinc-500 hover:text-red-600"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
