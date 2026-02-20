import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const project = await prisma.searchProject.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const [views, countRows] = await Promise.all([
      prisma.searchView.findMany({
        where: { projectId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      prisma.searchRow.groupBy({
        by: ["status"],
        where: { projectId },
        _count: { status: true },
      }),
    ]);

    const counts: Record<string, number> = { inbox: 0 };
    for (const g of countRows) {
      counts[g.status] = g._count.status;
    }

    return NextResponse.json({
      views: views.map((v) => ({
        id: v.id,
        projectId: v.projectId,
        name: v.name,
        sortOrder: v.sortOrder,
      })),
      counts,
    });
  } catch (error) {
    console.error("Views GET error:", error);
    return NextResponse.json({ error: "Error loading views" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const project = await prisma.searchProject.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, sortOrder } = body;
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { error: "name required" },
        { status: 400 }
      );
    }

    const maxOrder = await prisma.searchView
      .aggregate({
        where: { projectId },
        _max: { sortOrder: true },
      })
      .then((r) => r._max.sortOrder ?? -1);

    const view = await prisma.searchView.create({
      data: {
        projectId,
        name: name.trim(),
        sortOrder:
          typeof sortOrder === "number" ? sortOrder : maxOrder + 1,
      },
    });

    return NextResponse.json({
      id: view.id,
      projectId: view.projectId,
      name: view.name,
      sortOrder: view.sortOrder,
    });
  } catch (error) {
    console.error("Views POST error:", error);
    return NextResponse.json(
      { error: "Error creating view" },
      { status: 500 }
    );
  }
}
