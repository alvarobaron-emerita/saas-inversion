import { SearchDefaultColumnsEditor } from "@/components/search/SearchDefaultColumnsEditor";

export default function SearchSettingsPage() {
  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Ajustes Empresas</h1>
        <p className="mt-1 text-zinc-500">
          Columnas por defecto que se añadirán a todos los proyectos nuevos al subir un Excel
        </p>
      </div>
      <div className="rounded-lg border border-zinc-200 bg-white p-8">
        <SearchDefaultColumnsEditor />
      </div>
    </div>
  );
}
