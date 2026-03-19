import { randomUUID } from 'node:crypto'
import { and, asc, eq, inArray, notInArray } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { graphs } from '@/db/schema'

export interface GraphPayload {
  id: string
  title: string
  code: string
  sourcePresetId: string | null
}

export interface GraphStatePayload {
  activeGraphId: string
  codeFontSize: number
  theme: string
  transparent: boolean
  graphs: GraphPayload[]
}

export async function readGraphState(ownerId: string): Promise<GraphStatePayload | null> {
  const db = getDb()
  const rows = await db
    .select()
    .from(graphs)
    .where(and(eq(graphs.userId, ownerId), eq(graphs.isDeleted, false)))
    .orderBy(asc(graphs.createdAt))

  if (rows.length === 0) {
    return null
  }

  const firstRow = rows[0]

  return {
    activeGraphId: rows[0].id,
    codeFontSize: clampCodeFontSize(firstRow.codeFontSize),
    graphs: rows.map((row) => ({
      code: row.mermaidCode,
      id: row.id,
      sourcePresetId: row.sourcePresetId,
      title: row.title,
    })),
    theme: firstRow.theme,
    transparent: firstRow.transparent,
  }
}

export async function writeGraphState(ownerId: string, payload: GraphStatePayload) {
  const db = getDb()
  const now = new Date()
  const normalizedGraphs = payload.graphs.map((graph, index) => ({
    code: graph.code,
    id: isUuid(graph.id) ? graph.id : randomUUID(),
    sourcePresetId: graph.sourcePresetId,
    title: graph.title?.trim() ? graph.title.trim() : `Untitled graph ${index + 1}`,
  }))
  const incomingIds = normalizedGraphs.map((graph) => graph.id)

  await db.transaction(async (tx) => {
    if (incomingIds.length === 0) {
      await tx.delete(graphs).where(eq(graphs.userId, ownerId))
      return
    }

    await tx
      .delete(graphs)
      .where(and(eq(graphs.userId, ownerId), notInArray(graphs.id, incomingIds)))

    const existingRows = await tx
      .select({ id: graphs.id })
      .from(graphs)
      .where(and(eq(graphs.userId, ownerId), inArray(graphs.id, incomingIds)))

    const existingIds = new Set(existingRows.map((row) => row.id))

    const toInsert = normalizedGraphs.filter((graph) => !existingIds.has(graph.id))
    if (toInsert.length > 0) {
      await tx.insert(graphs).values(
        toInsert.map((graph) => ({
          codeFontSize: clampCodeFontSize(payload.codeFontSize),
          id: graph.id,
          isDeleted: false,
          mermaidCode: graph.code,
          sourcePresetId: graph.sourcePresetId,
          theme: payload.theme,
          title: graph.title,
          transparent: payload.transparent,
          updatedAt: now,
          userId: ownerId,
        })),
      )
    }

    const toUpdate = normalizedGraphs.filter((graph) => existingIds.has(graph.id))
    for (const graph of toUpdate) {
      await tx
        .update(graphs)
        .set({
          codeFontSize: clampCodeFontSize(payload.codeFontSize),
          isDeleted: false,
          mermaidCode: graph.code,
          sourcePresetId: graph.sourcePresetId,
          theme: payload.theme,
          title: graph.title,
          transparent: payload.transparent,
          updatedAt: now,
        })
        .where(and(eq(graphs.userId, ownerId), eq(graphs.id, graph.id)))
    }
  })
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function clampCodeFontSize(size: number) {
  if (!Number.isFinite(size)) {
    return 16
  }

  if (size < 12) {
    return 12
  }

  if (size > 28) {
    return 28
  }

  return Math.round(size)
}
