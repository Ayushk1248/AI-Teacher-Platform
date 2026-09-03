/**
 * POST /api/teacher/ask
 *
 * Live Q&A endpoint — Maya answers a student's question scoped to the
 * current lesson context. Includes conversation history for coherent
 * multi-turn dialogue.
 *
 * Request body: AskTeacherRequest
 * Response:     { answer: string; followUpSuggestions: string[] } | { error: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/providers'
import {
  ASK_TEACHER_SYSTEM,
  buildAskTeacherUserPrompt,
} from '@/lib/ai/teacher/prompts'
import type { AskTeacherRequest, AskTeacherResponse } from '@/lib/ai/types'

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
  let body: AskTeacherRequest
  try {
    body = (await req.json()) as AskTeacherRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.userMessage?.trim()) {
    return NextResponse.json({ error: 'Missing required field: userMessage' }, { status: 400 })
  }

  if (!body.lessonTitle?.trim()) {
    return NextResponse.json({ error: 'Missing required field: lessonTitle' }, { status: 400 })
  }

  // ── AI Provider ─────────────────────────────────────────────────────────────
  let provider
  try {
    provider = getAIProvider()
  } catch (err) {
    console.error('[ask] Provider init failed:', err)
    return NextResponse.json(
      { error: 'AI provider is not configured. Add GOOGLE_AI_API_KEY to .env.local.' },
      { status: 503 },
    )
  }

  // ── Build prompt and call LLM ───────────────────────────────────────────────
  const userPrompt = buildAskTeacherUserPrompt({
    lessonTitle: body.lessonTitle,
    lessonObjective: body.lessonObjective ?? '',
    lessonKeyPoints: body.lessonKeyPoints ?? [],
    conversationHistory: body.conversationHistory ?? [],
    userMessage: body.userMessage,
  })

  try {
    const raw = await provider.generateJSON<AskTeacherResponse>(
      ASK_TEACHER_SYSTEM,
      userPrompt,
      { temperature: 0.5 },
    )

    const response: AskTeacherResponse = {
      answer: String(raw?.answer ?? 'I am not sure. Could you rephrase your question?'),
      followUpSuggestions: Array.isArray(raw?.followUpSuggestions)
        ? raw.followUpSuggestions.map(String)
        : [],
    }

    return NextResponse.json(response, { status: 200 })
  } catch (err) {
    console.error('[ask] LLM call failed:', err)
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    )
  }
}
