import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { generateChatResponse } from "@/lib/llm/client";
import { buildChatSystemPrompt } from "@/lib/llm/prompts/discovery";
import type { ReportContent } from "@/types/discovery";

export const dynamic = "force-dynamic";

function reportToMarkdown(report: ReportContent | null): string {
  if (!report || report.length === 0) return "(Sin informe generado aún)";
  return report
    .map((s) => `### ${s.sectionName}\n\n${s.content}`)
    .join("\n\n---\n\n");
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { projectId, messages } = body;

    if (!projectId || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "projectId y messages son requeridos" },
        { status: 400 }
      );
    }

    const project = await prisma.discoveryProject.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const settings = await prisma.settings.findFirst();
    const thesis = settings?.thesis ?? "";
    const report = (project.report ?? []) as unknown as ReportContent;
    const reportMarkdown = reportToMarkdown(report);

    const systemPrompt = buildChatSystemPrompt({
      sector: project.sector ?? "",
      context: project.context ?? "",
      thesis,
      reportMarkdown,
    });

    const text = await generateChatResponse(systemPrompt, messages);
    return NextResponse.json({ content: text });
  } catch (error) {
    console.error("Chat error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Error en el chat",
      },
      { status: 500 }
    );
  }
}
