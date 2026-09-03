/**
 * POST /api/teacher/generate-lesson
 *
 * Generates a complete AI lesson from a topic + learner preferences.
 * Optionally retrieves context from uploaded materials via RAG.
 *
 * Request body: GenerateLessonRequest
 * Response:     { lesson: AILesson } | { error: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/providers'
import { generateLesson } from '@/lib/ai/teacher/lesson-generator'
import type { GenerateLessonRequest } from '@/lib/ai/types'

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const supabase = await createSupabaseServerClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 })
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: GenerateLessonRequest
  try {
    body = (await req.json()) as GenerateLessonRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.topic?.trim()) {
    return NextResponse.json({ error: 'Missing required field: topic' }, { status: 400 })
  }

  if (!body.preferences?.level || !body.preferences?.language) {
    return NextResponse.json(
      { error: 'Missing required field: preferences (level + language required)' },
      { status: 400 },
    )
  }

  // Attach the authenticated user ID so the generator can scope RAG retrieval
  body.userId = user.id

  // ── AI Provider ─────────────────────────────────────────────────────────────
  let provider
  try {
    provider = getAIProvider()
  } catch (err) {
    console.error('[generate-lesson] Provider init failed:', err)
    return NextResponse.json(
      { error: 'AI provider is not configured. Add GOOGLE_AI_API_KEY to .env.local.' },
      { status: 503 },
    )
  }

  // ── Generate ────────────────────────────────────────────────────────────────
  try {
    const lesson = await generateLesson(body, provider, supabase)
    return NextResponse.json({ lesson }, { status: 200 })
  } catch (err) {
    console.error('[generate-lesson] Generation failed:', err)
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    )
  }
}
