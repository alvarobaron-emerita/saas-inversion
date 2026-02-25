import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
import { prisma } from "@/lib/db/prisma";
import { requireSessionUser } from "@/lib/auth/session";
import { DEFAULT_REPORT_SECTIONS } from "@/lib/discovery-defaults";
import { generateAnalysis } from "@/lib/llm/client";
import { buildSectionPrompt } from "@/lib/llm/prompts/discovery";
import type { ReportSectionResult } from "@/types/discovery";

function sendEvent(controller: ReadableStreamDefaultController, data: object) {
  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
}

export async function POST(request: Request) {
  const auth = await requireSessionUser(request);
  if (auth.response) return auth.response;
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

    const settings = await prisma.settings.findFirst({ orderBy: { id: "asc" } });
    const thesis = settings?.thesis ?? "";
    const reportSections = (settings?.reportSections ?? []) as { id: string; name: string; prompt: string }[];
    const context = project.context ?? "";

    const sectionsToUse =
      reportSections.length === 0 ? [...DEFAULT_REPORT_SECTIONS] : reportSections;

    const total = sectionsToUse.length;
    const stream = new ReadableStream({
      async start(controller) {
        const results: ReportSectionResult[] = [];
        try {
          sendEvent(controller, {
            type: "sections_list",
            sectionNames: sectionsToUse.map((s) => s.name),
          });
          for (let i = 0; i < sectionsToUse.length; i++) {
            const section = sectionsToUse[i];
            sendEvent(controller, {
              type: "section_start",
              index: i,
              sectionName: section.name,
              total,
            });
            const prompt = buildSectionPrompt(section, sector, context, thesis);
            const content = await generateAnalysis(prompt);
            results.push({ sectionName: section.name, content });
            sendEvent(controller, { type: "section_done", index: i });
          }
          await prisma.discoveryProject.update({
            where: { id: projectId },
            data: {
              report: results as object,
              lastAnalyzedById: auth.user.id,
              lastAnalyzedAt: new Date(),
            },
          });
          sendEvent(controller, { type: "report", report: results });
        } catch (err) {
          console.error("Analyze stream error:", err);
          sendEvent(controller, {
            type: "error",
            error: err instanceof Error ? err.message : "Error en el análisis",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-store",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error en el análisis" },
      { status: 500 }
    );
  }
}
