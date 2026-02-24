import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_REPORT_SECTIONS } from "@/lib/discovery-defaults";
import type { SettingsData } from "@/types/settings";

export const dynamic = "force-dynamic";

function normalizeReportSections(raw: unknown): SettingsData["reportSections"] {
  if (Array.isArray(raw) && raw.length > 0) return raw as SettingsData["reportSections"];
  if (Array.isArray(raw)) return [];
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as SettingsData["reportSections"]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function GET() {
  try {
    let settings = await prisma.settings.findFirst({ orderBy: { id: "asc" } });
    if (!settings) {
      settings = await prisma.settings.create({
        data: {
          thesis: "",
          kpis: [],
          reportSections: [],
        },
      });
    }
    const reportSections = normalizeReportSections(settings.reportSections);
    if (reportSections.length === 0) {
      await prisma.settings.update({
        where: { id: settings.id },
        data: { reportSections: JSON.parse(JSON.stringify(DEFAULT_REPORT_SECTIONS)) },
      });
      settings = await prisma.settings.findUnique({
        where: { id: settings.id },
      });
      if (!settings) throw new Error("Settings not found after seed");
    }
    const finalSections = normalizeReportSections(settings.reportSections);
    return NextResponse.json({
      thesis: settings.thesis ?? "",
      kpis: (settings.kpis ?? []) as unknown as SettingsData["kpis"],
      reportSections: finalSections,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
    return NextResponse.json({ error: "Error loading settings" }, { status: 500 });
  }
}

async function handleSave(request: Request) {
  const body: SettingsData = await request.json();
  let settings = await prisma.settings.findFirst({ orderBy: { id: "asc" } });
  if (!settings) {
    settings = await prisma.settings.create({
      data: {
        thesis: body.thesis ?? "",
        kpis: JSON.parse(JSON.stringify(body.kpis ?? [])),
        reportSections: JSON.parse(JSON.stringify(body.reportSections ?? [])),
      },
    });
  } else {
    settings = await prisma.settings.update({
      where: { id: settings.id },
      data: {
        thesis: body.thesis ?? settings.thesis,
        kpis: JSON.parse(JSON.stringify(body.kpis ?? settings.kpis ?? [])),
        reportSections: JSON.parse(JSON.stringify(body.reportSections ?? settings.reportSections ?? [])),
      },
    });
  }
  return {
    thesis: settings.thesis ?? "",
    kpis: (settings.kpis ?? []) as unknown as SettingsData["kpis"],
    reportSections: (settings.reportSections ?? []) as unknown as SettingsData["reportSections"],
  };
}

export async function PUT(request: Request) {
  try {
    const payload = await handleSave(request);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Error saving settings" }, { status: 500 });
  }
}

/** POST también para guardar; en Vercel con Deployment Protection PUT a veces devuelve 405. */
export async function POST(request: Request) {
  try {
    const payload = await handleSave(request);
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Settings POST error:", error);
    return NextResponse.json({ error: "Error saving settings" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: "GET, PUT, POST, OPTIONS",
      "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
