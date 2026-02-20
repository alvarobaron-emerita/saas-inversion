import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { prisma } from "@/lib/db/prisma";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY no configurada" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { prompt: promptOverride, rowData: rawRowData, columnId, rowId } = body;

    let prompt: string;
    let contextData: Record<string, unknown>;
    let columnRef: Awaited<ReturnType<typeof prisma.searchColumn.findUnique>> = null;

    if (columnId != null && typeof columnId === "string") {
      // Modo columna: usar configuración de la columna IA
      const column = await prisma.searchColumn.findUnique({
        where: { id: columnId },
      });
      columnRef = column;
      if (!column) {
        return NextResponse.json({ error: "Column not found" }, { status: 404 });
      }
      if (column.type !== "ai") {
        return NextResponse.json(
          { error: "Column is not an AI column" },
          { status: 400 }
        );
      }
      if (!column.prompt || column.prompt.trim() === "") {
        return NextResponse.json(
          { error: "AI column has no prompt" },
          { status: 400 }
        );
      }

      const rowData = (rawRowData ?? {}) as Record<string, unknown>;

      // Filtrar contexto por inputColumnIds si está definido
      const inputIds = column.inputColumnIds as string[] | null | undefined;
      if (Array.isArray(inputIds) && inputIds.length > 0) {
        const projectColumns = await prisma.searchColumn.findMany({
          where: { projectId: column.projectId },
          select: { id: true, field: true },
        });
        const idToField = new Map(projectColumns.map((c) => [c.id, c.field]));
        const allowedFields = new Set(
          inputIds.map((id) => idToField.get(id)).filter(Boolean) as string[]
        );
        contextData = {};
        for (const [key, value] of Object.entries(rowData)) {
          if (allowedFields.has(key)) contextData[key] = value;
        }
      } else {
        contextData = { ...rowData };
      }

      prompt = column.prompt.trim();
      if (column.useOnlyRelevant) {
        prompt += "\n\nConsidera solo los campos del JSON relevantes para responder.";
      }
    } else {
      // Modo legacy: prompt y rowData libres
      if (!promptOverride || typeof promptOverride !== "string") {
        return NextResponse.json(
          { error: "prompt is required" },
          { status: 400 }
        );
      }
      prompt = promptOverride.trim();
      contextData = (rawRowData ?? {}) as Record<string, unknown>;
    }

    const context = JSON.stringify(contextData, null, 2);
    const isRatingAndReason =
      columnRef?.outputStyle === "rating_and_reason" &&
      columnRef.pairColumnId != null &&
      columnRef.pairColumnId !== "";

    const suffix = isRatingAndReason
      ? "\n\nResponde ÚNICAMENTE con un JSON válido, sin markdown ni texto extra, con exactamente: {\"rating\": <número del 1 al 10>, \"explanation\": \"<breve explicación en una frase>\"}."
      : "\n\nResponde de forma concisa (1-2 frases).";
    const userPrompt = `${prompt}\n\nDatos de la fila (JSON):\n${context}${suffix}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
    });

    const text = response.text?.trim() ?? "";

    // Si se pidió escribir en la fila, actualizar SearchRow
    if (rowId != null && typeof rowId === "string" && columnRef) {
      const row = await prisma.searchRow.findFirst({
        where: { id: rowId, projectId: columnRef.projectId },
      });
      if (row) {
        const currentData = (row.data ?? {}) as Record<string, unknown>;
        let newData: Record<string, unknown> = { ...currentData };

        if (isRatingAndReason) {
          const jsonStr = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
          try {
            const parsed = JSON.parse(jsonStr) as { rating?: number; explanation?: string };
            const rating =
              typeof parsed.rating === "number"
                ? Math.min(10, Math.max(1, Math.round(parsed.rating)))
                : null;
            const explanation =
              typeof parsed.explanation === "string" ? parsed.explanation.trim() : "";
            newData[columnRef.field] = rating;
            const pairColumn = await prisma.searchColumn.findUnique({
              where: { id: columnRef.pairColumnId! },
              select: { field: true },
            });
            if (pairColumn) {
              newData[pairColumn.field] = explanation;
            }
          } catch {
            newData[columnRef.field] = text;
          }
        } else {
          newData[columnRef.field] = text;
        }

        await prisma.searchRow.update({
          where: { id: rowId },
          data: { data: newData as object },
        });
      }
    }

    return NextResponse.json({ result: text });
  } catch (error) {
    console.error("AI column error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
