/**
 * Lesson generator — the core teacher agent orchestrator.
 *
 * Responsibility:
 *   1. Receive a GenerateLessonRequest (topic + preferences + optional material IDs)
 *   2. Retrieve relevant context from Supabase via pgvector (RAG)
 *   3. Call the AI provider with the constructed prompt
 *   4. Validate and return a type-safe AILesson
 *
 * This module is intentionally stateless — all context is passed in.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIProvider } from '../providers/types'
import type { GenerateLessonRequest, AILesson } from '../types'
import {
  LESSON_GENERATION_SYSTEM,
  buildLessonUserPrompt,
} from './prompts'
import { retrieveRelevantChunks, formatChunksAsContext } from '../rag/retriever'

/**
 * Generate a complete lesson for the given request.
 *
 * @param request  Lesson generation parameters (topic, preferences, materials)
 * @param provider AI provider instance (from getAIProvider())
 * @param supabase Supabase server client (for RAG retrieval)
 */
export async function generateLesson(
  request: GenerateLessonRequest,
  provider: AIProvider,
  supabase: SupabaseClient,
): Promise<AILesson> {
  const {
    topic,
    preferences,
    materialIds = [],
    userId,
    lessonIndex = 0,
    previousTopics = [],
  } = request

  // ── Step 1: RAG retrieval (skip if no materials or no userId) ──────────────
  let ragContext = ''

  if (userId && materialIds.length > 0) {
    console.log(`[lesson-generator] Retrieving RAG context for topic: "${topic}"`)
    const chunks = await retrieveRelevantChunks(topic, userId, provider, supabase, {
      materialIds,
      topK: 8,
      minSimilarity: 0.45,
    })

    ragContext = formatChunksAsContext(chunks)

    if (ragContext) {
      console.log(`[lesson-generator] Injecting ${chunks.length} chunks as context`)
    } else {
      console.log('[lesson-generator] No relevant chunks found — using LLM knowledge only')
    }
  }

  // ── Step 2: Build prompt ───────────────────────────────────────────────────
  const userPrompt = buildLessonUserPrompt({
    topic,
    preferences,
    ragContext,
    previousTopics,
    lessonIndex,
  })

  // ── Step 3: Call LLM in JSON mode ─────────────────────────────────────────
  console.log(`[lesson-generator] Calling ${provider.name} to generate lesson...`)

  let raw: unknown
  try {
    raw = await provider.generateJSON<unknown>(
      LESSON_GENERATION_SYSTEM,
      userPrompt,
      { temperature: 0.4 },
    )
  } catch (err) {
    console.error('[lesson-generator] LLM call failed:', err)
    throw new Error(
      `Failed to generate lesson. The AI provider returned an error. Details: ${String(err)}`,
    )
  }

  // ── Step 4: Validate and return ───────────────────────────────────────────
  const lesson = validateLesson(raw)
  console.log(`[lesson-generator] Lesson generated: "${lesson.title}"`)
  return lesson
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * Validates the raw LLM JSON output against the AILesson shape.
 * Throws with a descriptive message if required fields are missing.
 * Fills optional fields with safe defaults.
 */
function validateLesson(raw: unknown): AILesson {
  if (!raw || typeof raw !== 'object') {
    throw new Error('[lesson-generator] LLM returned non-object JSON.')
  }

  const obj = raw as Record<string, unknown>

  // Required field check
  const required = [
    'title', 'subtitle', 'objective', 'summary', 'keyPoints',
    'teachingPrompt', 'question', 'reexplanation', 'completionMessage',
  ]

  for (const field of required) {
    if (obj[field] === undefined || obj[field] === null) {
      throw new Error(`[lesson-generator] LLM response missing required field: "${field}"`)
    }
  }

  const question = obj.question as Record<string, unknown>
  const questionRequired = ['type', 'prompt', 'explanation', 'teacherPrompt']
  for (const field of questionRequired) {
    if (question[field] === undefined) {
      throw new Error(`[lesson-generator] LLM response missing question.${field}`)
    }
  }

  const qType = (question.type === 'Freeform' ? 'Freeform' : 'MCQ')

  // Build the validated AILesson object with safe defaults
  return {
    id: String(obj.id ?? `lesson-${Date.now()}`),
    title: String(obj.title),
    subtitle: String(obj.subtitle),
    objective: String(obj.objective),
    summary: String(obj.summary),
    keyPoints: ensureStringArray(obj.keyPoints, 3),
    teachingPrompt: String(obj.teachingPrompt),
    visualPayload: obj.visualPayload ? String(obj.visualPayload) : undefined,
    sections: ensureSections(obj.sections),
    question: {
      type: qType,
      prompt: String(question.prompt),
      options: qType === 'MCQ' ? ensureStringArray(question.options, 4) : undefined,
      correctIndex: qType === 'MCQ' ? Math.max(0, Math.min(3, Number(question.correctIndex) || 0)) : undefined,
      expectedAnswer: qType === 'Freeform' ? String(question.expectedAnswer || '') : undefined,
      explanation: String(question.explanation),
      teacherPrompt: String(question.teacherPrompt),
      visualPayload: question.visualPayload ? String(question.visualPayload) : undefined,
    },
    reexplanation: String(obj.reexplanation),
    completionMessage: String(obj.completionMessage),
    nextTopicSuggestion: obj.nextTopicSuggestion ? String(obj.nextTopicSuggestion) : undefined,
  }
}

function ensureStringArray(value: unknown, minLength: number): string[] {
  if (!Array.isArray(value)) return Array(minLength).fill('') as string[]
  return value.map(String)
}

function ensureSections(value: unknown): AILesson['sections'] {
  if (!Array.isArray(value)) {
    return [
      { title: 'Core concept', type: 'Concept', minutes: 8, description: '' },
      { title: 'Worked example', type: 'Example', minutes: 10, description: '' },
      { title: 'Practice', type: 'Practice', minutes: 7, description: '' },
      { title: 'Checkpoint', type: 'Checkpoint', minutes: 5, description: '' },
    ]
  }
  return value.map((s: unknown) => {
    const section = s as Record<string, unknown>
    return {
      title: String(section.title ?? ''),
      type: (section.type as AILesson['sections'][0]['type']) ?? 'Concept',
      minutes: Number(section.minutes) || 5,
      description: String(section.description ?? ''),
    }
  })
}
