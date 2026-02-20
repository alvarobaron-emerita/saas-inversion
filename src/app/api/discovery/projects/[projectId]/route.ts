import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const project = await prisma.discoveryProject.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json({
      id: project.id,
      name: project.name,
      sector: project.sector,
      context: project.context,
      report: project.report,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Discovery project GET error:", error);
    return NextResponse.json({ error: "Error loading project" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const project = await prisma.discoveryProject.update({
      where: { id: projectId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.sector !== undefined && { sector: body.sector }),
        ...(body.context !== undefined && { context: body.context }),
        ...(body.report !== undefined && { report: body.report }),
      },
    });
    return NextResponse.json({
      id: project.id,
      name: project.name,
      sector: project.sector,
      context: project.context,
      report: project.report,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Discovery project PATCH error:", error);
    return NextResponse.json({ error: "Error updating project" }, { status: 500 });
  }
}
