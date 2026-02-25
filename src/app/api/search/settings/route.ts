import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import type { DefaultColumnTemplate, SearchSettingsData } from "@/types/search-settings";

export const dynamic = "force-dynamic";

function isValidTemplate(item: unknown): item is DefaultColumnTemplate {
  if (!item || typeof item !== "object") return false;
  const o = item as Record<string, unknown>;
  if (o.type !== "text" && o.type !== "formula" && o.type !== "ai") return false;
  if (typeof o.header !== "string" || !o.header.trim()) return false;
  if (o.type === "formula" && (typeof o.formula !== "string" || !o.formula.trim())) return false;
  if (o.type === "ai") {
    if (typeof o.prompt !== "string" || !o.prompt.trim()) return false;
    if (o.outputStyle != null && o.outputStyle !== "single" && o.outputStyle !== "rating_and_reason")
      return false;
    if (o.outputStyle === "rating_and_reason") {
      if (typeof o.headerCol1 !== "string" || !o.headerCol1.trim()) return false;
      if (typeof o.headerCol2 !== "string" || !o.headerCol2.trim()) return false;
    }
  }
  return true;
}

function normalizeTemplates(raw: unknown): DefaultColumnTemplate[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isValidTemplate).map((item) => {
    const t = item as DefaultColumnTemplate;
    return {
      type: t.type,
      header: t.header.trim(),
      ...(t.type === "formula" && { formula: (t.formula ?? "").trim() }),
      ...(t.type === "ai" && {
        prompt: (t.prompt ?? "").trim(),
        outputStyle: t.outputStyle ?? "single",
        ...(t.outputStyle === "rating_and_reason" && {
          headerCol1: (t.headerCol1 ?? "").trim(),
          headerCol2: (t.headerCol2 ?? "").trim(),
        }),
      }),
    } as DefaultColumnTemplate;
  });
}

export async function GET() {
  try {
    let settings = await prisma.searchSettings.findFirst({ orderBy: { id: "asc" } });
    if (!settings) {
      settings = await prisma.searchSettings.create({
        data: { defaultColumns: [] },
      });
    }
    const defaultColumns = normalizeTemplates(settings.defaultColumns);
    return NextResponse.json({ defaultColumns } satisfies SearchSettingsData);
  } catch (error) {
    console.error("Search settings GET error:", error);
    return NextResponse.json(
      { error: "Error loading search settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const raw = body?.defaultColumns;
    const defaultColumns = normalizeTemplates(raw);

    let settings = await prisma.searchSettings.findFirst({ orderBy: { id: "asc" } });
    if (!settings) {
      settings = await prisma.searchSettings.create({
        data: { defaultColumns: defaultColumns as object },
      });
    } else {
      settings = await prisma.searchSettings.update({
        where: { id: settings.id },
        data: { defaultColumns: defaultColumns as object },
      });
    }
    const out = normalizeTemplates(settings.defaultColumns);
    return NextResponse.json({ defaultColumns: out } satisfies SearchSettingsData);
  } catch (error) {
    console.error("Search settings PUT error:", error);
    return NextResponse.json(
      { error: "Error saving search settings" },
      { status: 500 }
    );
  }
}

/** POST also supported for compatibility (e.g. deployment protection). */
export async function POST(request: Request) {
  return PUT(request);
}
