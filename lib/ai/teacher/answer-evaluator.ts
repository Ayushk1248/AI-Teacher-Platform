/**
 * Answer evaluator — the AI agent that assesses student answers.
 *
 * Unlike lesson generation, evaluation does NOT require RAG retrieval —
 * all necessary context is passed in the request (lesson title, objective,
 * key points, question, and student answer).
 *
 * Returns an AIEvaluation with:
 *   - correct/incorrect judgment
 *   - personalised feedback
 *   - a re-explanation using a DIFFERENT analogy than the teaching phase
 *   - the specific misconception detected (if wrong)
 *   - an optional visual payload for the blackboard
 */

import type { AIProvider } from '../providers/types'
import type { EvaluateAnswerRequest, AIEvaluation } from '../types'
import {
  ANSWER_EVALUATION_SYSTEM,
  buildEvaluationUserPrompt,
} from './prompts'

/**
 * Evaluate a student's answer and return structured feedback.
 *
 * @param request  All the context needed to evaluate (lesson, question, answer)
 * @param provider AI provider instance
 */
export async function evaluateAnswer(
  request: EvaluateAnswerRequest,
  provider: AIProvider,
): Promise<AIEvaluation> {
  const {
    lessonTitle,
    lessonObjective,
    lessonKeyPoints,
    lessonTeachingPrompt,
    questionPrompt,
    questionOptions,
    correctIndex,
    selectedIndex,
    studentFreeformText,
  } = request

  // Build the evaluation user prompt
  const userPrompt = buildEvaluationUserPrompt({
    lessonTitle,
    lessonObjective,
    lessonKeyPoints,
    teachingPromptSummary: lessonTeachingPrompt,
    questionPrompt,
    questionOptions,
    correctIndex,
    selectedIndex,
    studentFreeformText,
  })

  // Call the LLM in JSON mode
  console.log(`[answer-evaluator] Evaluating answer for lesson: "${lessonTitle}"`)

  let raw: unknown
  try {
    raw = await provider.generateJSON<unknown>(
      ANSWER_EVALUATION_SYSTEM,
      userPrompt,
      { temperature: 0.3 },
    )
  } catch (err) {
    console.error('[answer-evaluator] LLM call failed:', err)
    throw new Error(
      `Failed to evaluate answer. The AI provider returned an error. Details: ${String(err)}`,
    )
  }

  const expectedAnswer = 'expectedAnswer' in request ? (request as any).expectedAnswer : undefined
  return validateEvaluation(raw, questionOptions, correctIndex, selectedIndex, expectedAnswer, studentFreeformText)
}

// ─── Validation ───────────────────────────────────────────────────────────────

function validateEvaluation(
  raw: unknown,
  questionOptions?: string[],
  correctIndex?: number,
  selectedIndex?: number,
  expectedAnswer?: string,
  studentFreeformText?: string,
): AIEvaluation {
  if (!raw || typeof raw !== 'object') {
    throw new Error('[answer-evaluator] LLM returned non-object JSON.')
  }

  const obj = raw as Record<string, unknown>

  // Fall back to deterministic values if LLM omits critical fields
  let fallbackCorrect = false
  if (selectedIndex !== undefined && correctIndex !== undefined) {
    fallbackCorrect = selectedIndex === correctIndex
  } else if (studentFreeformText && expectedAnswer) {
    // There is no easy deterministic fallback for freeform text, so default to true if LLM failed
    fallbackCorrect = true
  }

  const isCorrect =
    typeof obj.isCorrect === 'boolean'
      ? obj.isCorrect
      : fallbackCorrect

  const correctAnswer = String(
    obj.correctAnswer ?? (questionOptions && correctIndex !== undefined ? questionOptions[correctIndex] : expectedAnswer) ?? '',
  )

  return {
    isCorrect,
    feedback: String(obj.feedback ?? (isCorrect ? 'Correct!' : 'Not quite.')),
    correctAnswer,
    reexplanation: String(obj.reexplanation ?? ''),
    nextCta: String(obj.nextCta ?? (isCorrect ? 'Continue lesson' : 'Review concept')),
    visualPayload: obj.visualPayload ? String(obj.visualPayload) : undefined,
    misunderstandingDetected:
      obj.misunderstandingDetected != null
        ? String(obj.misunderstandingDetected)
        : null,
  }
}
