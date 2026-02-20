import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const projects = await prisma.searchProject.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Search projects GET error:", error);
    return NextResponse.json({ error: "Error loading projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const project = await prisma.searchProject.create({
      data: { name: name.trim() },
    });
    return NextResponse.json({
      id: project.id,
      name: project.name,
      createdAt: project.createdAt.toISOString(),
    });
  } catch (error) {
    console.error("Search project POST error:", error);
    return NextResponse.json({ error: "Error creating project" }, { status: 500 });
  }
}
