import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids, targetStatus } = body as { ids?: string[]; targetStatus?: string };

    if (!Array.isArray(ids) || ids.length === 0 || typeof targetStatus !== "string") {
      return NextResponse.json(
        { error: "ids array and targetStatus required" },
        { status: 400 }
      );
    }

    const rows = await prisma.searchRow.findMany({
      where: { id: { in: ids } },
      select: { id: true, projectId: true, data: true },
    });

    if (rows.length !== ids.length) {
      return NextResponse.json(
        { error: "Some rows not found" },
        { status: 404 }
      );
    }

    const projectIds = new Set(rows.map((r) => r.projectId));
    if (projectIds.size > 1) {
      return NextResponse.json(
        { error: "All rows must belong to the same project" },
        { status: 400 }
      );
    }

    const projectId = rows[0].projectId;

    if (targetStatus !== "inbox") {
      const view = await prisma.searchView.findFirst({
        where: { id: targetStatus, projectId },
      });
      if (!view) {
        return NextResponse.json(
          { error: "Target view not found" },
          { status: 400 }
        );
      }
    }

    const maxRow = await prisma.searchRow.aggregate({
      where: { projectId },
      _max: { rowIndex: true },
    });
    const startIndex = (maxRow._max.rowIndex ?? -1) + 1;

    await prisma.searchRow.createMany({
      data: rows.map((r, i) => ({
        projectId: r.projectId,
        rowIndex: startIndex + i,
        status: targetStatus,
        data: r.data as object,
      })),
    });

    return NextResponse.json({ ok: true, copied: rows.length });
  } catch (error) {
    console.error("Rows batch-copy error:", error);
    return NextResponse.json(
      { error: "Error copying rows" },
      { status: 500 }
    );
  }
}
