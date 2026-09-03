/**
 * POST /api/teacher/evaluate-answer
 *
 * Evaluates a student's answer to a lesson checkpoint question.
 * Detects misunderstandings and generates personalized re-explanations.
 *
 * Request body: EvaluateAnswerRequest
 * Response:     { evaluation: AIEvaluation } | { error: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getAIProvider } from '@/lib/ai/providers'
import { evaluateAnswer } from '@/lib/ai/teacher/answer-evaluator'
import type { EvaluateAnswerRequest } from '@/lib/ai/types'

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
  let body: EvaluateAnswerRequest
  try {
    body = (await req.json()) as EvaluateAnswerRequest
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const isMcq = body.questionOptions !== undefined

  const requiredFields: (keyof EvaluateAnswerRequest)[] = [
    'lessonTitle',
    'lessonObjective',
    'lessonKeyPoints',
    'lessonTeachingPrompt',
    'questionPrompt',
  ]

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null) {
      return NextResponse.json(
        { error: `Missing required field: ${field}` },
        { status: 400 },
      )
    }
  }

  if (isMcq) {
    if (body.correctIndex === undefined || body.selectedIndex === undefined) {
      return NextResponse.json({ error: 'Missing correctIndex or selectedIndex for MCQ' }, { status: 400 })
    }
    if (
      typeof body.selectedIndex !== 'number' ||
      body.selectedIndex < 0 ||
      body.selectedIndex >= body.questionOptions!.length
    ) {
      return NextResponse.json(
        { error: `selectedIndex (${body.selectedIndex}) is out of range` },
        { status: 400 },
      )
    }
  } else {
    if (!body.expectedAnswer && !body.studentFreeformText) {
       return NextResponse.json({ error: 'Missing expectedAnswer or studentFreeformText for Freeform question' }, { status: 400 })
    }
  }

  // ── AI Provider ─────────────────────────────────────────────────────────────
  let provider
  try {
    provider = getAIProvider()
  } catch (err) {
    console.error('[evaluate-answer] Provider init failed:', err)
    return NextResponse.json(
      { error: 'AI provider is not configured. Add GOOGLE_AI_API_KEY to .env.local.' },
      { status: 503 },
    )
  }

  // ── Evaluate ────────────────────────────────────────────────────────────────
  try {
    const evaluation = await evaluateAnswer(body, provider)
    return NextResponse.json({ evaluation }, { status: 200 })
  } catch (err) {
    console.error('[evaluate-answer] Evaluation failed:', err)
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    )
  }
}
