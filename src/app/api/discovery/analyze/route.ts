import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db/prisma";
import { generateAnalysis } from "@/lib/llm/client";
import { buildSectionPrompt } from "@/lib/llm/prompts/discovery";
import type { ReportSectionResult } from "@/types/discovery";

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { projectId } = body;
    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const project = await prisma.discoveryProject.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const sector = project.sector || "";
    if (!sector.trim()) {
      return NextResponse.json(
        { error: "El proyecto debe tener un sector definido" },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.findFirst();
    const thesis = settings?.thesis ?? "";
    const kpis = (settings?.kpis ?? []) as { name: string; min?: number; max?: number; unit?: string }[];
    const reportSections = (settings?.reportSections ?? []) as { id: string; name: string; prompt: string }[];
    const context = project.context ?? "";

    if (reportSections.length === 0) {
      const defaultSections = [
        { id: "1", name: "Resumen Ejecutivo", prompt: "Escribe un resumen ejecutivo del sector." },
        { id: "2", name: "Unit Economics y Financieros", prompt: "Analiza los unit economics y aspectos financieros típicos del sector." },
        { id: "3", name: "Tamaño y Segmentación", prompt: "Describe el tamaño del mercado y su segmentación." },
        { id: "4", name: "Cadena de Valor", prompt: "Explica la cadena de valor del sector." },
        { id: "5", name: "Estructura Competitiva", prompt: "Analiza la estructura competitiva." },
        { id: "6", name: "Regulación y Riesgos", prompt: "Identifica regulación relevante y riesgos." },
        { id: "7", name: "Oportunidades", prompt: "Señala oportunidades de inversión basadas en la tesis." },
      ];
      reportSections.push(...defaultSections);
    }

    const results: ReportSectionResult[] = [];

    for (const section of reportSections) {
      const prompt = buildSectionPrompt(section, sector, context, thesis, kpis);
      const content = await generateAnalysis(prompt);
      results.push({ sectionName: section.name, content });
    }

    await prisma.discoveryProject.update({
      where: { id: projectId },
      data: { report: results as object },
    });

    return NextResponse.json({ report: results });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error en el análisis" },
      { status: 500 }
    );
  }
}
