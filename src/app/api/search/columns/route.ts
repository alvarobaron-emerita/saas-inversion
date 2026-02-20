import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectId,
      field,
      header,
      type,
      prompt,
      formula,
      inputColumnIds,
      useOnlyRelevant,
      outputStyle,
      pairColumnId,
    } = body;

    if (!projectId || !field || !header || !type) {
      return NextResponse.json(
        { error: "projectId, field, header, type required" },
        { status: 400 }
      );
    }

    if (!["text", "formula", "ai"].includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    if (outputStyle != null && !["single", "rating_and_reason"].includes(outputStyle)) {
      return NextResponse.json(
        { error: "outputStyle must be 'single' or 'rating_and_reason'" },
        { status: 400 }
      );
    }

    const headerWidth = Math.max(120, Math.min(600, (header as string).length * 10));
    const col = await prisma.searchColumn.create({
      data: {
        projectId,
        field,
        header,
        type,
        prompt: type === "ai" ? prompt ?? null : null,
        formula: type === "formula" ? formula ?? null : null,
        ...(type === "ai" &&
          Array.isArray(inputColumnIds) &&
          inputColumnIds.length > 0 && { inputColumnIds: inputColumnIds as object }),
        useOnlyRelevant: type === "ai" && useOnlyRelevant === true,
        ...(type === "ai" && outputStyle != null && { outputStyle }),
        ...(type === "ai" && pairColumnId != null && typeof pairColumnId === "string" && { pairColumnId }),
        width: headerWidth,
      },
    });

    return NextResponse.json(col);
  } catch (error) {
    console.error("Column POST error:", error);
    return NextResponse.json({ error: "Error creating column" }, { status: 500 });
  }
}
