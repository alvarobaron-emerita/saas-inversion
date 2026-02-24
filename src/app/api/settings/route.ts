import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { DEFAULT_REPORT_SECTIONS } from "@/lib/discovery-defaults";
import type { SettingsData } from "@/types/settings";

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
    const reportSections = (settings.reportSections ?? []) as unknown as SettingsData["reportSections"];
    if (reportSections.length === 0) {
      settings = await prisma.settings.update({
        where: { id: settings.id },
        data: { reportSections: JSON.parse(JSON.stringify(DEFAULT_REPORT_SECTIONS)) },
      });
    }
    const finalSections = (settings.reportSections ?? []) as unknown as SettingsData["reportSections"];
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

export async function PUT(request: Request) {
  try {
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
    const payload = {
      thesis: settings.thesis ?? "",
      kpis: (settings.kpis ?? []) as unknown as SettingsData["kpis"],
      reportSections: (settings.reportSections ?? []) as unknown as SettingsData["reportSections"],
    };
    return NextResponse.json(payload);
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Error saving settings" }, { status: 500 });
  }
}
