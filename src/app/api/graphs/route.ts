import { NextResponse } from 'next/server'
import {
  readGraphState,
  type GraphStatePayload,
  writeGraphState,
} from '@/server/graphs-store'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const state = await readGraphState(user.id)
    return NextResponse.json({ state })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  if (!isGraphStatePayload(body)) {
    return NextResponse.json({ error: 'Invalid state payload' }, { status: 400 })
  }

  try {
    await writeGraphState(user.id, body)
    return NextResponse.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function isGraphStatePayload(value: unknown): value is GraphStatePayload {
  if (!value || typeof value !== 'object') {
    return false
  }

  const payload = value as Partial<GraphStatePayload>

  if (typeof payload.activeGraphId !== 'string') {
    return false
  }

  if (typeof payload.codeFontSize !== 'number') {
    return false
  }

  if (typeof payload.theme !== 'string') {
    return false
  }

  if (typeof payload.transparent !== 'boolean') {
    return false
  }

  if (!Array.isArray(payload.graphs)) {
    return false
  }

  return payload.graphs.every(
    (graph) =>
      graph &&
      typeof graph.id === 'string' &&
      typeof graph.title === 'string' &&
      typeof graph.code === 'string' &&
      (typeof graph.sourcePresetId === 'string' || graph.sourcePresetId === null),
  )
}
