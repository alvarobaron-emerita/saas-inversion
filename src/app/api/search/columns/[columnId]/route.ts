import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const VALID_PINNED = ["left", "right", null] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const { columnId } = await params;
    const body = await request.json();
    const { pinned, width, hidden, prompt, inputColumnIds, useOnlyRelevant, outputStyle, pairColumnId } = body;

    if (pinned !== undefined && !VALID_PINNED.includes(pinned)) {
      return NextResponse.json(
        { error: "pinned must be 'left', 'right', or null" },
        { status: 400 }
      );
    }
    if (width !== undefined && (typeof width !== "number" || width < 50)) {
      return NextResponse.json(
        { error: "width must be a number >= 50" },
        { status: 400 }
      );
    }
    if (hidden !== undefined && typeof hidden !== "boolean") {
      return NextResponse.json(
        { error: "hidden must be a boolean" },
        { status: 400 }
      );
    }
    if (prompt !== undefined && typeof prompt !== "string") {
      return NextResponse.json({ error: "prompt must be a string" }, { status: 400 });
    }
    if (inputColumnIds !== undefined && !(Array.isArray(inputColumnIds) || inputColumnIds === null)) {
      return NextResponse.json(
        { error: "inputColumnIds must be an array or null" },
        { status: 400 }
      );
    }
    if (useOnlyRelevant !== undefined && typeof useOnlyRelevant !== "boolean") {
      return NextResponse.json(
        { error: "useOnlyRelevant must be a boolean" },
        { status: 400 }
      );
    }
    if (outputStyle !== undefined && outputStyle !== null && !["single", "rating_and_reason"].includes(outputStyle)) {
      return NextResponse.json(
        { error: "outputStyle must be 'single' or 'rating_and_reason'" },
        { status: 400 }
      );
    }
    if (pairColumnId !== undefined && pairColumnId !== null && typeof pairColumnId !== "string") {
      return NextResponse.json(
        { error: "pairColumnId must be a string or null" },
        { status: 400 }
      );
    }

    const column = await prisma.searchColumn.findUnique({
      where: { id: columnId },
    });
    if (!column) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }

    const aiFields: {
      prompt?: string | null;
      inputColumnIds?: object | typeof Prisma.DbNull;
      useOnlyRelevant?: boolean;
      outputStyle?: string | null;
      pairColumnId?: string | null;
    } =
      column.type === "ai"
        ? {
            ...(prompt !== undefined && { prompt: prompt ?? null }),
            ...(inputColumnIds !== undefined && {
              inputColumnIds:
                Array.isArray(inputColumnIds) && inputColumnIds.length > 0
                  ? (inputColumnIds as object)
                  : Prisma.DbNull,
            }),
            ...(useOnlyRelevant !== undefined && { useOnlyRelevant }),
            ...(outputStyle !== undefined && { outputStyle: outputStyle ?? null }),
            ...(pairColumnId !== undefined && { pairColumnId: pairColumnId ?? null }),
          }
        : {};

    const updated = await prisma.searchColumn.update({
      where: { id: columnId },
      data: {
        ...(pinned !== undefined && { pinned }),
        ...(width !== undefined && { width }),
        ...(hidden !== undefined && { hidden }),
        ...aiFields,
      },
    });

    return NextResponse.json({
      id: updated.id,
      projectId: updated.projectId,
      field: updated.field,
      header: updated.header,
      type: updated.type,
      prompt: updated.prompt ?? undefined,
      inputColumnIds: updated.inputColumnIds ?? undefined,
      useOnlyRelevant: updated.useOnlyRelevant,
      outputStyle: updated.outputStyle ?? undefined,
      pairColumnId: updated.pairColumnId ?? undefined,
      width: updated.width ?? undefined,
      pinned: updated.pinned,
      hidden: updated.hidden,
    });
  } catch (error) {
    console.error("Column PATCH error:", error);
    return NextResponse.json(
      { error: "Error updating column" },
      { status: 500 }
    );
  }
}
