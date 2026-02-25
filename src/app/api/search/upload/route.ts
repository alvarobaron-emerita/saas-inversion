import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { ParsedSheet } from "@/lib/excel/types";
import { parseExcel, parseCSV } from "@/lib/excel/parser";
import { collapseMarkBlocks } from "@/lib/excel/collapseMarkBlocks";
import { normalizeSabi } from "@/lib/excel/normalizer";
import type { DefaultColumnTemplate } from "@/types/search-settings";

const ROW_BATCH_SIZE = 500;

function headerToField(header: string, suffix?: number): string {
  const base = header
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 28) || `col_${Date.now()}`;
  const withSuffix = suffix != null ? `${base}_${suffix}` : base;
  return withSuffix.slice(0, 30);
}

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    let project: { id: string } | null = null;
    if (projectId) {
      project = await prisma.searchProject.findUnique({
        where: { id: projectId },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found" }, { status: 404 });
      }
    }

    let targetProjectId: string;
    if (!project) {
      const name = file.name.replace(/\.[^.]+$/, "");
      const created = await prisma.searchProject.create({
        data: { name },
      });
      targetProjectId = created.id;
    } else {
      targetProjectId = project.id;
      await prisma.searchRow.deleteMany({ where: { projectId: project.id } });
      await prisma.searchColumn.deleteMany({ where: { projectId: project.id } });
    }

    const buffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop()?.toLowerCase();

    let parsed: ParsedSheet;
    if (ext === "csv" || ext === "txt") {
      parsed = parseCSV(buffer);
    } else {
      parsed = parseExcel(buffer);
    }

    parsed = collapseMarkBlocks(parsed);
    const originalHeaders = [...parsed.columns];
    const normalized = normalizeSabi(parsed);

    const cols = normalized.columns;
    const excelColumnCount = cols.length;
    const columnData = cols.map((col, i) => {
      const header = originalHeaders[i] ?? col;
      const headerWidth = Math.max(120, Math.min(600, header.length * 10));
      return {
        projectId: targetProjectId,
        field: col,
        header,
        type: "text" as const,
        width: headerWidth,
        sortOrder: i,
      };
    });
    await prisma.searchColumn.createMany({ data: columnData });

    const searchSettings = await prisma.searchSettings.findFirst({
      orderBy: { id: "asc" },
    });
    const defaultColumns = Array.isArray(searchSettings?.defaultColumns)
      ? (searchSettings.defaultColumns as unknown as DefaultColumnTemplate[])
      : [];
    let nextSortOrder = excelColumnCount;
    for (let i = 0; i < defaultColumns.length; i++) {
      const t = defaultColumns[i];
      if (!t || typeof t !== "object" || !t.type || !t.header?.trim()) continue;
      const headerWidth = Math.max(
        120,
        Math.min(600, String(t.header).length * 10)
      );
      if (t.type === "text") {
        const field = headerToField(t.header, i);
        await prisma.searchColumn.create({
          data: {
            projectId: targetProjectId,
            field,
            header: t.header.trim(),
            type: "text",
            width: headerWidth,
            sortOrder: nextSortOrder++,
          },
        });
      } else if (t.type === "formula" && t.formula != null) {
        const field = headerToField(t.header, i);
        await prisma.searchColumn.create({
          data: {
            projectId: targetProjectId,
            field,
            header: t.header.trim(),
            type: "formula",
            formula: t.formula.trim(),
            width: headerWidth,
            sortOrder: nextSortOrder++,
          },
        });
      } else if (t.type === "ai" && t.prompt?.trim()) {
        const outputStyle = t.outputStyle ?? "single";
        if (outputStyle === "rating_and_reason" && t.headerCol1 && t.headerCol2) {
          const baseField = headerToField(t.headerCol1, i);
          const reasonField = `${baseField}_motivo`.slice(0, 30);
          const reasonCol = await prisma.searchColumn.create({
            data: {
              projectId: targetProjectId,
              field: reasonField,
              header: t.headerCol2.trim(),
              type: "text",
              width: headerWidth,
              sortOrder: nextSortOrder++,
            },
          });
          await prisma.searchColumn.create({
            data: {
              projectId: targetProjectId,
              field: baseField,
              header: t.headerCol1.trim(),
              type: "ai",
              prompt: t.prompt.trim(),
              outputStyle: "rating_and_reason",
              pairColumnId: reasonCol.id,
              width: headerWidth,
              sortOrder: nextSortOrder++,
            },
          });
        } else {
          const field = headerToField(t.header, i);
          await prisma.searchColumn.create({
            data: {
              projectId: targetProjectId,
              field,
              header: t.header.trim(),
              type: "ai",
              prompt: t.prompt.trim(),
              outputStyle: "single",
              width: headerWidth,
              sortOrder: nextSortOrder++,
            },
          });
        }
      }
    }

    const rows = normalized.rows;
    for (let offset = 0; offset < rows.length; offset += ROW_BATCH_SIZE) {
      const batch = rows.slice(offset, offset + ROW_BATCH_SIZE);
      await prisma.searchRow.createMany({
        data: batch.map((row, i) => ({
          projectId: targetProjectId,
          rowIndex: offset + i,
          status: "inbox",
          data: row as object,
        })),
      });
    }

    return NextResponse.json({
      projectId: targetProjectId,
      rowCount: rows.length,
      columnCount: nextSortOrder,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
