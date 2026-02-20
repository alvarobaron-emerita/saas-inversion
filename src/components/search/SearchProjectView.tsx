"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DataGrid } from "./DataGrid";
import { FileUploadZone } from "./FileUploadZone";
import { ColumnEditor } from "./ColumnEditor";
import { ColumnActionBar } from "./ColumnActionBar";
import { ColumnsPinEditor } from "./ColumnsPinEditor";
import { EditAIColumnDialog } from "./EditAIColumnDialog";
import { ProjectTabs } from "./ProjectTabs";
import { SelectionActionBar } from "./SelectionActionBar";
import type { AgGridReact } from "ag-grid-react";

async function fetchProject(projectId: string) {
  const res = await fetch(`/api/search/projects/${projectId}`);
  if (!res.ok) throw new Error("Project not found");
  return res.json();
}

async function fetchData(projectId: string, status?: string) {
  const url = status
    ? `/api/search/data?projectId=${projectId}&status=${status}`
    : `/api/search/data?projectId=${projectId}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Error loading data");
  return res.json();
}

async function fetchViews(projectId: string) {
  const res = await fetch(`/api/search/projects/${projectId}/views`);
  if (!res.ok) throw new Error("Error loading views");
  return res.json();
}

export function SearchProjectView({ projectId }: { projectId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const gridRef = useRef<AgGridReact>(null);
  const [activeTab, setActiveTab] = useState<string>("inbox");
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([]);
  const [runAIProgress, setRunAIProgress] = useState<string | null>(null);
  const [editAIColumnId, setEditAIColumnId] = useState<string | null>(null);

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ["search-project", projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId,
  });

  const { data: viewsData, refetch: refetchViews } = useQuery({
    queryKey: ["search-views", projectId],
    queryFn: () => fetchViews(projectId),
    enabled: !!projectId && !!project,
  });

  const { data: gridData, isLoading: dataLoading, refetch } = useQuery({
    queryKey: ["search-data", projectId, activeTab],
    queryFn: () => fetchData(projectId, activeTab),
    enabled: !!projectId,
  });

  const handleUpload = async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("projectId", projectId);
    const res = await fetch("/api/search/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error((await res.json()).error || "Error");
    window.location.reload();
  };

  const handleMoveRows = async (status: string) => {
    await Promise.all(
      selectedRowIds.map((id) =>
        fetch(`/api/search/rows/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        })
      )
    );
    refetch();
    refetchViews();
  };

  const handleCopyRows = async (targetStatus: string) => {
    const res = await fetch("/api/search/rows/batch-copy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedRowIds, targetStatus }),
    });
    if (!res.ok) throw new Error("Error al copiar");
    refetch();
    refetchViews();
  };

  const handleDeleteRows = async () => {
    const res = await fetch("/api/search/rows/batch-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: selectedRowIds }),
    });
    if (!res.ok) throw new Error("Error al eliminar");
    refetch();
    refetchViews();
  };

  const clearSelection = () => {
    setSelectedRowIds([]);
    gridRef.current?.api?.deselectAll();
  };

  const CONCURRENCY = 2;

  const handleRunAI = async (columnId: string) => {
    const rows = (gridData?.rows ?? []).filter((r: { id: string }) =>
      selectedRowIds.includes(r.id)
    ) as { id: string; data: Record<string, unknown> }[];
    if (rows.length === 0) {
      return;
    }
    const total = rows.length;
    setRunAIProgress(`Generando 0 de ${total}`);
    let done = 0;
    const runOne = async (row: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch("/api/search/ai-column", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnId,
          rowData: row.data ?? {},
          rowId: row.id,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()).error ?? "Error";
        throw new Error(err);
      }
      done += 1;
      setRunAIProgress(`Generando ${done} de ${total}`);
    };
    try {
      for (let i = 0; i < rows.length; i += CONCURRENCY) {
        const chunk = rows.slice(i, i + CONCURRENCY);
        await Promise.all(chunk.map(runOne));
      }
      queryClient.invalidateQueries({ queryKey: ["search-data", projectId, activeTab] });
      setRunAIProgress(null);
    } catch (e) {
      setRunAIProgress(null);
      alert(e instanceof Error ? e.message : "Error al generar con IA");
    }
  };

  const clearColumnSelection = () => setSelectedColumnIds([]);

  const handleApplyColumnWidth = async (width: number) => {
    await Promise.all(
      selectedColumnIds.map((columnId) =>
        fetch(`/api/search/columns/${columnId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ width }),
        })
      )
    );
    refetch();
  };

  const handleApplyColumnPin = async (pinned: "left" | "right" | null) => {
    await Promise.all(
      selectedColumnIds.map((columnId) =>
        fetch(`/api/search/columns/${columnId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinned }),
        })
      )
    );
    refetch();
  };

  const handleAutoSizeColumns = (columnIds: string[]) => {
    const api = gridRef.current?.api as {
      autoSizeColumns?: (ids: string[]) => void;
      getColumnState?: () => { colId: string; width?: number }[];
      getColumns?: () => { getColId: () => string; getActualWidth?: () => number }[];
    } | undefined;
    if (!api?.autoSizeColumns || columnIds.length === 0) return;
    api.autoSizeColumns(columnIds);
    setTimeout(() => {
      const byId = new Map<string, number>();
      if (typeof api.getColumnState === "function") {
        const state = api.getColumnState() ?? [];
        state.forEach((s: { colId: string; width?: number }) => {
          if (s.width != null && s.width > 0) byId.set(s.colId, s.width);
        });
      } else if (typeof api.getColumns === "function") {
        const cols = api.getColumns() ?? [];
        cols.forEach((col: { getColId: () => string; getActualWidth?: () => number }) => {
          const id = col.getColId();
          const w = col.getActualWidth?.();
          if (typeof w === "number" && w > 0) byId.set(id, w);
        });
      }
      Promise.all(
        columnIds.map((id) => {
          const w = byId.get(id);
          const width = typeof w === "number" && w >= 50 ? Math.round(w) : undefined;
          if (width == null) return Promise.resolve();
          return fetch(`/api/search/columns/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ width }),
          });
        })
      ).then(() => {
        queryClient.setQueryData(
          ["search-data", projectId, activeTab],
          (old: { columns: { id: string; width?: number }[]; rows: unknown[] } | undefined) => {
            if (!old?.columns) return old;
            const updates = new Map(columnIds.map((id) => [id, byId.get(id)]));
            return {
              ...old,
              columns: old.columns.map((c) => {
                const w = updates.get(c.id);
                if (w == null || typeof w !== "number") return c;
                const width = w >= 50 ? Math.round(w) : c.width;
                return { ...c, width };
              }),
            };
          }
        );
      });
    }, 250);
  };

  if (projectLoading || !project) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
      </div>
    );
  }

  const hasData = gridData && (gridData.rows?.length > 0 || gridData.columns?.length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-200 bg-white px-6 py-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push("/search/new")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold text-zinc-900">{project.name}</h1>
        </div>
        {hasData && (
          <div className="flex items-center gap-2">
            <ColumnsPinEditor
              columns={(gridData?.columns ?? []).map((c: {
                id: string;
                header: string;
                pinned?: string | null;
                hidden?: boolean;
                type?: string;
                prompt?: string | null;
                inputColumnIds?: string[] | null;
                useOnlyRelevant?: boolean;
              }) => ({
                id: c.id,
                header: c.header,
                pinned: c.pinned,
                hidden: c.hidden,
                type: c.type,
                prompt: c.prompt,
                inputColumnIds: c.inputColumnIds,
                useOnlyRelevant: c.useOnlyRelevant,
              }))}
              onEditAIColumn={setEditAIColumnId}
              onPinChange={async (columnId, pinned) => {
                const res = await fetch(`/api/search/columns/${columnId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ pinned }),
                });
                if (res.ok) refetch();
              }}
              onVisibilityChange={async (columnId, visible) => {
                const res = await fetch(`/api/search/columns/${columnId}`, {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ hidden: !visible }),
                });
                if (res.ok) refetch();
              }}
              onClose={() => refetch()}
            />
            <EditAIColumnDialog
              open={!!editAIColumnId}
              onOpenChange={(open) => !open && setEditAIColumnId(null)}
              column={
                editAIColumnId
                  ? ((gridData?.columns ?? []).find(
                      (c: { id: string }) => c.id === editAIColumnId
                    ) as {
                      id: string;
                      header: string;
                      prompt?: string | null;
                      inputColumnIds?: string[] | null;
                      useOnlyRelevant?: boolean;
                      outputStyle?: string | null;
                      pairColumnId?: string | null;
                    }) ?? null
                  : null
              }
              existingColumns={(gridData?.columns ?? [])
                .filter((c: { id: string }) => c.id !== editAIColumnId)
                .map((c: { id: string; header: string }) => ({ id: c.id, header: c.header }))}
              onSaved={() => {
                refetch();
                setEditAIColumnId(null);
              }}
            />
            <ColumnEditor
              projectId={projectId}
              onColumnAdded={() => refetch()}
              existingColumns={(gridData?.columns ?? []).map((c: { id: string; header: string }) => ({
                id: c.id,
                header: c.header,
              }))}
            />
          </div>
        )}
      </div>

      {!hasData ? (
        <div className="flex-1 p-8">
          <FileUploadZone onUpload={handleUpload} projectId={projectId} />
        </div>
      ) : (
        <>
          <div className="border-b border-zinc-200 px-6">
            <ProjectTabs
              projectId={projectId}
              views={viewsData?.views ?? []}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={viewsData?.counts ?? { inbox: 0 }}
              onViewCreated={(newViewId) => {
                refetchViews();
                setActiveTab(newViewId);
              }}
              loading={!viewsData}
            />
          </div>
          <div className="flex-1 overflow-hidden p-4 pb-20">
            {dataLoading ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
              </div>
            ) : (
              <>
                {selectedColumnIds.length > 0 && (
                  <ColumnActionBar
                    selectedCount={selectedColumnIds.length}
                    onApplyWidth={handleApplyColumnWidth}
                    onApplyPin={handleApplyColumnPin}
                    onAutoSizeContent={() => handleAutoSizeColumns(selectedColumnIds)}
                    onClearSelection={clearColumnSelection}
                  />
                )}
                <DataGrid
                  ref={gridRef}
                  columns={gridData?.columns ?? []}
                  rows={gridData?.rows ?? []}
                  onColumnPinChange={async (columnId, pinned) => {
                    const res = await fetch(`/api/search/columns/${columnId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ pinned }),
                    });
                    if (res.ok) refetch();
                  }}
                  onColumnResized={async (columnId, width) => {
                    const idsToUpdate =
                      selectedColumnIds.length >= 2 && selectedColumnIds.includes(columnId)
                        ? selectedColumnIds
                        : [columnId];
                    await Promise.all(
                      idsToUpdate.map((id) =>
                        fetch(`/api/search/columns/${id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ width }),
                        })
                      )
                    );
                    queryClient.setQueryData(
                      ["search-data", projectId, activeTab],
                      (old: { columns: { id: string; width?: number }[]; rows: unknown[] } | undefined) => {
                        if (!old?.columns) return old;
                        const idSet = new Set(idsToUpdate);
                        return {
                          ...old,
                          columns: old.columns.map((c) =>
                            idSet.has(c.id) ? { ...c, width } : c
                          ),
                        };
                      }
                    );
                  }}
                  onColumnVisible={async (columnId, visible) => {
                    const res = await fetch(`/api/search/columns/${columnId}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ hidden: !visible }),
                    });
                    if (res.ok) refetch();
                  }}
                  onHeaderDoubleClick={(columnId) => {
                    const cols =
                      selectedColumnIds.length >= 2 && selectedColumnIds.includes(columnId)
                        ? selectedColumnIds
                        : [columnId];
                    handleAutoSizeColumns(cols);
                  }}
                  onSelectionChanged={setSelectedRowIds}
                  selectedColumnIds={selectedColumnIds}
                  onColumnSelectionChanged={setSelectedColumnIds}
                />
              </>
            )}
          </div>
          {selectedRowIds.length > 0 && (
            <SelectionActionBar
              selectedCount={selectedRowIds.length}
              views={viewsData?.views ?? []}
              activeTab={activeTab}
              aiColumns={(gridData?.columns ?? []).filter(
                (c: { type?: string }) => c.type === "ai"
              ).map((c: { id: string; header: string; field: string }) => ({
                id: c.id,
                header: c.header,
                field: c.field,
              }))}
              onMove={handleMoveRows}
              onCopy={handleCopyRows}
              onRunAI={handleRunAI}
              onDelete={handleDeleteRows}
              onClearSelection={clearSelection}
              runAIProgress={runAIProgress}
            />
          )}
        </>
      )}
    </div>
  );
}
