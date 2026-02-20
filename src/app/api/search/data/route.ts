import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const status = searchParams.get("status"); // inbox | viewId

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    if (status && status !== "inbox") {
      const view = await prisma.searchView.findFirst({
        where: { id: status, projectId },
      });
      if (!view) {
        return NextResponse.json({ error: "Invalid status (view not found)" }, { status: 400 });
      }
    }

    const columns = await prisma.searchColumn.findMany({
      where: { projectId },
      orderBy: { id: "asc" },
    });

    const rows = await prisma.searchRow.findMany({
      where: {
        projectId,
        ...(status && { status }),
      },
      orderBy: { rowIndex: "asc" },
    });

    return NextResponse.json({
      columns,
      rows: rows.map((r) => ({
        id: r.id,
        rowIndex: r.rowIndex,
        status: r.status,
        data: r.data,
      })),
    });
  } catch (error) {
    console.error("Search data GET error:", error);
    return NextResponse.json({ error: "Error loading data" }, { status: 500 });
  }
}
