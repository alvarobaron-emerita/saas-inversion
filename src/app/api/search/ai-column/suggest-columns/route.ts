import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const dynamic = "force-dynamic";

export interface SuggestColumnsResponse {
  suggestions: { columnId: string; header: string; reason: string }[];
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
    const { prompt, columns } = body as {
      prompt?: string;
      columns?: { id: string; header: string }[];
    };

    if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(columns) || columns.length === 0) {
      return NextResponse.json(
        { error: "columns must be a non-empty array of { id, header }" },
        { status: 400 }
      );
    }

    const columnList = columns
      .map((c: { id?: string; header?: string }) => `${c.id}: ${c.header ?? ""}`)
      .join("\n");

    const systemPrompt = `Eres un asistente que ayuda a elegir qué columnas de datos son relevantes para responder un prompt de usuario.
Te doy el prompt del usuario y la lista de columnas disponibles (cada una con id y nombre).
Responde ÚNICAMENTE con un JSON válido, sin markdown ni texto extra, con este formato:
{"suggestions":[{"columnId":"<id>","header":"<nombre>","reason":"<breve razón en una frase>"}, ...]}

Incluye solo las columnas que consideres relevantes para el prompt. Si ninguna lo es, devuelve {"suggestions":[]}.
Sé conciso en "reason" (máximo una frase).`;

    const userPrompt = `Prompt del usuario:\n${prompt.trim()}\n\nColumnas disponibles (id: nombre):\n${columnList}\n\nResponde solo con el JSON.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `${systemPrompt}\n\n${userPrompt}`,
    });

    const text = (response.text ?? "").trim();
    // Quitar posibles bloques de código markdown
    const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let parsed: { suggestions?: unknown[] };
    try {
      parsed = JSON.parse(jsonStr) as { suggestions?: unknown[] };
    } catch {
      return NextResponse.json(
        { error: "La respuesta del modelo no es JSON válido" },
        { status: 502 }
      );
    }

    const raw = (Array.isArray(parsed.suggestions) ? parsed.suggestions : []) as {
      columnId?: string;
      header?: string;
      reason?: string;
    }[];
    const idToHeader = new Map(columns.map((c: { id: string; header: string }) => [c.id, c.header]));
    const suggestions: { columnId: string; header: string; reason: string }[] = raw
      .filter(
        (s: { columnId?: string; header?: string; reason?: string }) =>
          s && typeof s.columnId === "string" && idToHeader.has(s.columnId)
      )
      .map((s: { columnId: string; header?: string; reason?: string }) => ({
        columnId: s.columnId,
        header: idToHeader.get(s.columnId) ?? s.header ?? "",
        reason: typeof s.reason === "string" ? s.reason.trim() : "",
      }));

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Suggest columns error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
