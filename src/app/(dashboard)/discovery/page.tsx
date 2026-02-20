"use client";

import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DiscoveryPage() {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="rounded-full bg-zinc-100 p-4">
          <Zap className="h-10 w-10 text-zinc-600" />
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Sectores</h1>
        <p className="text-zinc-500 max-w-md">
          Copiloto de Inversión. Crea un nuevo análisis de sector para descubrir oportunidades.
        </p>
      </div>
      <Button
        onClick={() => router.push("/discovery/new")}
        size="lg"
      >
        + Nuevo análisis
      </Button>
      <p className="text-sm text-zinc-400">
        Selecciona un análisis o crea uno nuevo desde la barra lateral.
      </p>
    </div>
  );
}
