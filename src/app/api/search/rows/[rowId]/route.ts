import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ rowId: string }> }
) {
  try {
    const { rowId } = await params;
    const body = await request.json();
    const { status } = body;

    const row = await prisma.searchRow.findUnique({
      where: { id: rowId },
      select: { projectId: true },
    });
    if (!row) {
      return NextResponse.json({ error: "Row not found" }, { status: 404 });
    }

    if (status !== undefined) {
      if (status !== "inbox") {
        const view = await prisma.searchView.findFirst({
          where: { id: status, projectId: row.projectId },
        });
        if (!view) {
          return NextResponse.json({ error: "Invalid status (view not found)" }, { status: 400 });
        }
      }
    }

    const updated = await prisma.searchRow.update({
      where: { id: rowId },
      data: {
        ...(status !== undefined && { status }),
        ...(body.data && { data: body.data as object }),
      },
    });

    return NextResponse.json({
      id: updated.id,
      rowIndex: updated.rowIndex,
      status: updated.status,
      data: updated.data,
    });
  } catch (error) {
    console.error("Row PATCH error:", error);
    return NextResponse.json({ error: "Error updating row" }, { status: 500 });
  }
}
