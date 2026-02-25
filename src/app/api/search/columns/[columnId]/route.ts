import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

const hasAIFields = (body: Record<string, unknown>) =>
  ["prompt", "inputColumnIds", "useOnlyRelevant", "outputStyle", "pairColumnId"].some(
    (k) => body[k] !== undefined
  );

export const dynamic = "force-dynamic";

const VALID_PINNED = ["left", "right", null] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const { columnId } = await params;
    const body = await request.json();
    const { pinned, width, hidden, sortOrder: sortOrderBody, prompt, inputColumnIds, useOnlyRelevant, outputStyle, pairColumnId } = body;

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
    if (sortOrderBody !== undefined && (typeof sortOrderBody !== "number" || sortOrderBody < 0)) {
      return NextResponse.json(
        { error: "sortOrder must be a non-negative number" },
        { status: 400 }
      );
    }

    // Al ocultar una columna, no puede seguir fijada. Asegurar que null se persista al desfijar.
    const effectivePinned =
      hidden === true ? null : pinned !== undefined ? pinned : undefined;

    const updateData: Parameters<typeof prisma.searchColumn.update>[0]["data"] = {
      ...(width !== undefined && { width }),
      ...(hidden !== undefined && { hidden }),
      ...(sortOrderBody !== undefined && { sortOrder: sortOrderBody }),
    };
    if (effectivePinned !== undefined) {
      (updateData as { pinned?: string | null }).pinned = effectivePinned;
    }

    if (hasAIFields(body)) {
      const column = await prisma.searchColumn.findUnique({
        where: { id: columnId },
      });
      if (!column) {
        return NextResponse.json({ error: "Column not found" }, { status: 404 });
      }
      const aiFields =
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
      Object.assign(updateData, aiFields);
    }

    let updated: Awaited<ReturnType<typeof prisma.searchColumn.update>>;
    try {
      updated = await prisma.searchColumn.update({
        where: { id: columnId },
        data: updateData,
      });
    } catch (e) {
      const err = e as Error & { code?: string };
      const msg = err?.message ?? String(e);
      console.error("Column PATCH update failed:", { columnId, updateData, error: msg, code: err?.code });

      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
        return NextResponse.json({ error: "Column not found" }, { status: 404 });
      }
      // Posible columna sortOrder no existente en BD (migración no aplicada)
      if (
        typeof msg === "string" &&
        (msg.includes("sortOrder") || msg.includes("Unknown column") || /column.*does not exist/i.test(msg))
      ) {
        return NextResponse.json(
          {
            error: "Error updating column",
            code: "SCHEMA_MIGRATION_NEEDED",
            hint: "Asegúrate de haber aplicado la migración que añade sortOrder a SearchColumn (ej. 20250225000000_add_column_sort_order).",
          },
          { status: 503 }
        );
      }
      throw e;
    }

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
      sortOrder: updated.sortOrder,
    });
  } catch (error) {
    console.error("Column PATCH error:", error);
    return NextResponse.json(
      { error: "Error updating column" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ columnId: string }> }
) {
  try {
    const { columnId } = await params;
    const existing = await prisma.searchColumn.findUnique({
      where: { id: columnId },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }
    await prisma.searchColumn.delete({
      where: { id: columnId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Column DELETE error:", error);
    return NextResponse.json(
      { error: "Error deleting column" },
      { status: 500 }
    );
  }
}
