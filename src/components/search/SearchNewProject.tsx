"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { FileUploadZone } from "./FileUploadZone";

async function uploadFile(file: File, projectId?: string) {
  const form = new FormData();
  form.append("file", file);
  if (projectId) form.append("projectId", projectId);

  const res = await fetch("/api/search/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    let message = "Error al subir";
    try {
      const err = JSON.parse(text) as { error?: string };
      if (err?.error) message = err.error;
    } catch {
      if (res.status === 504)
        message =
          "Error al subir. Si el archivo es grande, el servidor puede haber tardado demasiado.";
      else if (text) message = text.slice(0, 200);
    }
    throw new Error(message);
  }
  return res.json();
}

export function SearchNewProject() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const handleUpload = async (file: File, projectId?: string) => {
    const result = await uploadFile(file, projectId);
    queryClient.invalidateQueries({ queryKey: ["search-projects"] });
    router.push(`/search/${result.projectId}`);
  };

  return (
    <div className="flex flex-col gap-6 p-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900">Nuevo proyecto</h1>
        <p className="mt-1 text-zinc-500">
          Crea un proyecto y sube un archivo Excel/CSV de SABI
        </p>
      </div>
      <FileUploadZone onUpload={handleUpload} />
    </div>
  );
}
