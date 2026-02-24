import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { ParsedSheet } from "@/lib/excel/types";
import { parseExcel, parseCSV } from "@/lib/excel/parser";
import { collapseMarkBlocks } from "@/lib/excel/collapseMarkBlocks";
import { normalizeSabi } from "@/lib/excel/normalizer";

const ROW_BATCH_SIZE = 500;

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
    const columnData = cols.map((col, i) => {
      const header = originalHeaders[i] ?? col;
      const headerWidth = Math.max(120, Math.min(600, header.length * 10));
      return {
        projectId: targetProjectId,
        field: col,
        header,
        type: "text" as const,
        width: headerWidth,
      };
    });
    await prisma.searchColumn.createMany({ data: columnData });

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
      columnCount: cols.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
