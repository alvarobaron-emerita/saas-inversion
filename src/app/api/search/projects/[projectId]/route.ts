import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

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
    return NextResponse.json({
      id: project.id,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Search project GET error:", error);
    return NextResponse.json({ error: "Error loading project" }, { status: 500 });
  }
}

export async function DELETE(
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
    await prisma.searchProject.delete({
      where: { id: projectId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Search project DELETE error:", error);
    return NextResponse.json({ error: "Error deleting project" }, { status: 500 });
  }
}
