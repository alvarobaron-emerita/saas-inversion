import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
// Más tiempo para proyectos con muchas columnas (una sola query, pero validaciones + conexión)
export const maxDuration = 30;

/**
 * PATCH: actualiza el orden de todas las columnas del proyecto en una sola petición.
 * Body: { orderedColumnIds: string[] }
 * Usa un único UPDATE con unnest para evitar timeout por cientos de round-trips.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const body = await request.json();
    const { orderedColumnIds } = body;

    if (!Array.isArray(orderedColumnIds) || orderedColumnIds.length === 0) {
      return NextResponse.json(
        { error: "orderedColumnIds must be a non-empty array" },
        { status: 400 }
      );
    }

    const ids = orderedColumnIds as string[];
    if (ids.some((id) => typeof id !== "string")) {
      return NextResponse.json(
        { error: "Each orderedColumnId must be a string" },
        { status: 400 }
      );
    }

    const projectColumns = await prisma.searchColumn.findMany({
      where: { projectId },
      select: { id: true },
    });
    const projectColumnIds = new Set(projectColumns.map((c) => c.id));
    const invalidIds = ids.filter((id) => !projectColumnIds.has(id));
    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: "Some column ids do not belong to this project", invalidIds: invalidIds.slice(0, 5) },
        { status: 400 }
      );
    }
    if (ids.length !== projectColumnIds.size) {
      return NextResponse.json(
        { error: "orderedColumnIds must contain exactly all column ids of the project" },
        { status: 400 }
      );
    }

    const sortOrders = ids.map((_, index) => index);
    await prisma.$executeRawUnsafe(
      `UPDATE "SearchColumn" AS c
       SET "sortOrder" = sub.ord
       FROM (SELECT * FROM unnest($2::text[], $3::int[]) AS t(id, ord)) AS sub
       WHERE c.id = sub.id AND c."projectId" = $1`,
      projectId,
      ids,
      sortOrders
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Columns order PATCH error:", error);
    return NextResponse.json(
      { error: "Error updating column order" },
      { status: 500 }
    );
  }
}
