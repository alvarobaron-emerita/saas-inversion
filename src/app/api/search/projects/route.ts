import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { requireSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const projects = await prisma.searchProject.findMany({
      orderBy: { createdAt: "desc" },
      include: { createdBy: { select: { id: true, email: true, name: true } } },
    });
    return NextResponse.json(
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt.toISOString(),
        createdBy: p.createdBy ? { id: p.createdBy.id, email: p.createdBy.email, name: p.createdBy.name } : null,
      }))
    );
  } catch (error) {
    console.error("Search projects GET error:", error);
    return NextResponse.json({ error: "Error loading projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireSessionUser(request);
  if (auth.response) return auth.response;
  try {
    const body = await request.json();
    const { name } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const project = await prisma.searchProject.create({
      data: { name: name.trim(), createdById: auth.user.id },
      include: { createdBy: { select: { id: true, email: true, name: true } } },
    });
    return NextResponse.json({
      id: project.id,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
      createdBy: project.createdBy ? { id: project.createdBy.id, email: project.createdBy.email, name: project.createdBy.name } : null,
    });
  } catch (error) {
    console.error("Search project POST error:", error);
    return NextResponse.json({ error: "Error creating project" }, { status: 500 });
  }
}
