"use client";

import { useCallback, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadZoneProps {
  onUpload: (file: File, projectId?: string) => Promise<void>;
  projectId?: string;
  disabled?: boolean;
}

export function FileUploadZone({
  onUpload,
  projectId,
  disabled,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["xlsx", "xls", "csv", "txt"].includes(ext ?? "")) {
        alert("Formato no soportado. Usa Excel (.xlsx, .xls) o CSV (.csv, .txt)");
        return;
      }
      setIsUploading(true);
      try {
        await onUpload(file, projectId);
      } catch (err) {
        console.error(err);
        alert(err instanceof Error ? err.message : "Error al subir");
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload, projectId]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => setIsDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`
        flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors
        ${isDragging ? "border-zinc-400 bg-zinc-50" : "border-zinc-200 bg-white"}
        ${disabled ? "opacity-50 pointer-events-none" : ""}
      `}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-zinc-100">
        <FileSpreadsheet className="h-8 w-8 text-zinc-600" />
      </div>
      <h3 className="text-base font-medium text-zinc-900">
        Cargar archivo Excel/CSV/TXT
      </h3>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        Sube un archivo de SABI (CSV, Excel o TXT) para empezar. El sistema
        normalizará automáticamente las columnas.
      </p>
      <div className="mt-6">
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls,.csv,.txt"
          onChange={onInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />
        <Button
          type="button"
          disabled={isUploading}
          onClick={() => document.getElementById("file-input")?.click()}
        >
          <Upload className="mr-2 h-4 w-4" />
          {isUploading ? "Subiendo..." : "Seleccionar archivo"}
        </Button>
      </div>
    </div>
  );
}
