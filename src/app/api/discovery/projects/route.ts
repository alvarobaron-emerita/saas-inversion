import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
  try {
    const projects = await prisma.discoveryProject.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(
      projects.map((p) => ({
        id: p.id,
        name: p.name,
        sector: p.sector,
        context: p.context,
        report: p.report,
        createdAt: p.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error("Discovery projects GET error:", error);
    return NextResponse.json({ error: "Error loading projects" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, sector, context } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const project = await prisma.discoveryProject.create({
      data: {
        name: name.trim(),
        sector: sector?.trim() || null,
        context: context?.trim() || null,
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
    console.error("Discovery project POST error:", error);
    return NextResponse.json({ error: "Error creating project" }, { status: 500 });
  }
}
