"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SearchPage() {
  const router = useRouter();

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 p-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="rounded-full bg-zinc-100 p-4">
          <Search className="h-10 w-10 text-zinc-600" />
        </div>
        <h1 className="text-2xl font-semibold text-zinc-900">Empresas</h1>
        <p className="text-zinc-500 max-w-md">
          Gestiona y analiza datos de empresas. Carga listados de SABI y trabaja como en Excel.
        </p>
      </div>
      <Button onClick={() => router.push("/search/new")} size="lg">
        + Nuevo proyecto
      </Button>
      <p className="text-sm text-zinc-400">
        Crea un proyecto y sube un archivo Excel/CSV de SABI para empezar.
      </p>
    </div>
  );
}
