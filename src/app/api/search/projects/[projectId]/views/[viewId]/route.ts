import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

async function getViewAndProject(viewId: string, projectId: string) {
  const view = await prisma.searchView.findFirst({
    where: { id: viewId, projectId },
  });
  if (!view) return null;
  const project = await prisma.searchProject.findUnique({
    where: { id: projectId },
  });
  return project ? { view, project } : null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; viewId: string }> }
) {
  try {
    const { projectId, viewId } = await params;
    const found = await getViewAndProject(viewId, projectId);
    if (!found) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, sortOrder } = body;
    const data: { name?: string; sortOrder?: number } = {};
    if (typeof name === "string" && name.trim()) data.name = name.trim();
    if (typeof sortOrder === "number") data.sortOrder = sortOrder;

    const view = await prisma.searchView.update({
      where: { id: viewId },
      data,
    });

    return NextResponse.json({
      id: view.id,
      projectId: view.projectId,
      name: view.name,
      sortOrder: view.sortOrder,
    });
  } catch (error) {
    console.error("View PATCH error:", error);
    return NextResponse.json(
      { error: "Error updating view" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; viewId: string }> }
) {
  try {
    const { projectId, viewId } = await params;
    const found = await getViewAndProject(viewId, projectId);
    if (!found) {
      return NextResponse.json({ error: "View not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.searchRow.updateMany({
        where: { projectId, status: viewId },
        data: { status: "inbox" },
      }),
      prisma.searchView.delete({
        where: { id: viewId },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("View DELETE error:", error);
    return NextResponse.json(
      { error: "Error deleting view" },
      { status: 500 }
    );
  }
}
