import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body as { ids?: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids array required and must not be empty" },
        { status: 400 }
      );
    }

    const rows = await prisma.searchRow.findMany({
      where: { id: { in: ids } },
      select: { id: true, projectId: true },
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

    await prisma.searchRow.deleteMany({
      where: { id: { in: ids } },
    });

    return NextResponse.json({ ok: true, deleted: ids.length });
  } catch (error) {
    console.error("Rows batch-delete error:", error);
    return NextResponse.json(
      { error: "Error deleting rows" },
      { status: 500 }
    );
  }
}
