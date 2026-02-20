import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { ParsedSheet } from "@/lib/excel/types";
import { parseExcel, parseCSV } from "@/lib/excel/parser";
import { collapseMarkBlocks } from "@/lib/excel/collapseMarkBlocks";
import { normalizeSabi } from "@/lib/excel/normalizer";

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
    for (let i = 0; i < cols.length; i++) {
      const header = originalHeaders[i] ?? cols[i];
      const headerWidth = Math.max(120, Math.min(600, header.length * 10));
      await prisma.searchColumn.create({
        data: {
          projectId: targetProjectId,
          field: cols[i],
          header,
          type: "text",
          width: headerWidth,
        },
      });
    }

    const rows = normalized.rows;
    for (let i = 0; i < rows.length; i++) {
      await prisma.searchRow.create({
        data: {
          projectId: targetProjectId,
          rowIndex: i,
          status: "inbox",
          data: rows[i] as object,
        },
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
