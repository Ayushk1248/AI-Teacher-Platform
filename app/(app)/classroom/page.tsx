'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Bot,
  Captions,
  Check,
  ChevronRight,
  Circle,
  Code2,
  Pause,
  Play,
  Radio,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { getTeacherEngine, type TeacherLessonId, type TeacherEvaluation } from '@/lib/teacher-engine'

type LessonPhase =
  | 'teaching'
  | 'question'
  | 'answering'
  | 'evaluating'
  | 'reexplaining'
  | 'continuing'

type ResponseMode = 'mcq' | 'freeform'

type LessonStep = {
  id: number
  title: string
  type: 'Concept' | 'Example' | 'Practice' | 'Checkpoint'
  minutes: number
  description: string
  status: 'done' | 'current' | 'upcoming'
}

const lessonPlanByLesson: Record<TeacherLessonId, LessonStep[]> = {
  'ai-teacher-demo-lesson-1': [
    { id: 1, title: 'What a neural network really is', type: 'Concept', minutes: 6, description: 'Neurons, layers, and how information flows forward through a network.', status: 'done' },
    { id: 2, title: 'Weights, biases & activations', type: 'Concept', minutes: 8, description: 'How a single neuron computes, and why activation functions matter.', status: 'done' },
    { id: 3, title: 'Worked example: a tiny network', type: 'Example', minutes: 10, description: 'Trace a 2-layer network end to end with real numbers.', status: 'current' },
    { id: 4, title: 'Loss functions & gradient descent', type: 'Concept', minutes: 9, description: 'Measuring error and nudging weights in the right direction.', status: 'upcoming' },
    { id: 5, title: 'Practice: predict the output', type: 'Practice', minutes: 7, description: 'Apply what you learned to three short problems.', status: 'upcoming' },
    { id: 6, title: 'Checkpoint quiz', type: 'Checkpoint', minutes: 5, description: 'A quick adaptive check before moving to backpropagation.', status: 'upcoming' },
  ],
  'ai-teacher-demo-lesson-2': [
    { id: 1, title: 'Predict and compare', type: 'Concept', minutes: 6, description: 'Use a prediction to compare the model output with the target.', status: 'done' },
    { id: 2, title: 'Loss landscape', type: 'Concept', minutes: 8, description: 'See how the loss tells us whether the model is improving.', status: 'done' },
    { id: 3, title: 'Train step by step', type: 'Example', minutes: 10, description: 'Follow one adjustment to the weights in a real update.', status: 'current' },
    { id: 4, title: 'Gradient descent intuition', type: 'Concept', minutes: 9, description: 'Why the update direction matters for learning.', status: 'upcoming' },
    { id: 5, title: 'Spot the improvement', type: 'Practice', minutes: 7, description: 'Look at before-and-after predictions.', status: 'upcoming' },
    { id: 6, title: 'Final check', type: 'Checkpoint', minutes: 5, description: 'Confirm the learning loop before finishing.', status: 'upcoming' },
  ],
}

const classroomTranscriptBase: Record<TeacherLessonId, Array<{ time: string; text: string }>> = {
  'ai-teacher-demo-lesson-1': [
    { time: '00:00', text: 'Welcome back. Let us walk through a real forward pass.' },
    { time: '01:20', text: 'Here is our input vector and the first layer of weights.' },
    { time: '03:05', text: 'Notice how the bias shifts each neuron before activation.' },
  ],
  'ai-teacher-demo-lesson-2': [
    { time: '00:00', text: 'We are now checking the signal that tells the model whether it is improving.' },
    { time: '01:40', text: 'The loss tells us how far the prediction sits from the target.' },
    { time: '03:20', text: 'Each update nudges the weights in a direction that reduces the error.' },
  ],
}

export default function ClassroomPage() {
  const router = useRouter()
  const engine = useMemo(() => getTeacherEngine(), [])
  const supabase = useMemo(() => createSupabaseBrowserClient(), [])
  const [playing, setPlaying] = useState(true)
  const [paused, setPaused] = useState(false)
  const [phase, setPhase] = useState<LessonPhase>('teaching')
  const [responseMode, setResponseMode] = useState<ResponseMode>('mcq')
  const [selected, setSelected] = useState<number | null>(null)
  const [shortAnswer, setShortAnswer] = useState('')
  const [answerError, setAnswerError] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [showAskPanel, setShowAskPanel] = useState(false)
  const [resumePhase, setResumePhase] = useState<LessonPhase>('teaching')
  const [askDraft, setAskDraft] = useState('')
  const [currentLessonId, setCurrentLessonId] = useState<TeacherLessonId>('ai-teacher-demo-lesson-1')
  const [evaluation, setEvaluation] = useState<TeacherEvaluation | null>(null)
  const [currentVisualPayload, setCurrentVisualPayload] = useState<string | undefined>(undefined)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoadingProgress, setIsLoadingProgress] = useState(true)

  const lesson = engine.getLessonById(currentLessonId)
  const lessonPlan = lessonPlanByLesson[currentLessonId]
  const classroomTranscript = classroomTranscriptBase[currentLessonId]
  const currentConcept = {
    lesson: lesson.title,
    step: currentLessonId === 'ai-teacher-demo-lesson-1' ? 3 : 5,
    totalSteps: 6,
    title: lesson.title,
    summary: lesson.summary,
    keyPoints: lesson.keyPoints,
  }
  const progressPct = Math.round((currentConcept.step / currentConcept.totalSteps) * 100)
  const classroomMcq = lesson.question

  const persistProgress = useCallback(
    async (nextPhase: LessonPhase = phase, nextPaused = paused, nextCompleted = false) => {
      if (!supabase || !userId) return

      const lessonTitleMap: Record<TeacherLessonId, string> = {
        'ai-teacher-demo-lesson-1': 'Introduction to Neural Networks',
        'ai-teacher-demo-lesson-2': 'How Neural Networks Learn',
      }

      const { data: lessonRow } = await supabase
        .from('lessons')
        .select('id')
        .eq('title', lessonTitleMap[currentLessonId])
        .maybeSingle()

      if (!lessonRow) return

      const snapshot = {
        lessonId: currentLessonId,
        section: nextPhase,
        conceptStep: currentConcept.step,
        interactionKey: `${currentLessonId}:${nextPhase}`,
        progressPct,
        paused: nextPaused,
        completed: nextCompleted,
        responseMode,
        selectedIndex: selected,
        shortAnswer,
        evaluation,
      }

      const saveStatus = nextCompleted ? 'completed' : 'in_progress'
      const { error } = await supabase
        .from('lesson_progress')
        .upsert(
          {
            user_id: userId,
            lesson_id: lessonRow.id,
            status: saveStatus,
            progress_percentage: nextCompleted ? 100 : progressPct,
            current_lesson: currentLessonId,
            current_section: nextPhase,
            current_concept: String(currentConcept.step),
            current_interaction: `${currentLessonId}:${nextPhase}`,
            paused: nextPaused,
            completed_at: nextCompleted ? new Date().toISOString() : null,
            updated_at: new Date().toISOString(),
            progress_state: snapshot,
          },
          { onConflict: 'user_id,lesson_id' },
        )

      if (!error && nextCompleted) {
        router.push(`/progress/assessment?lessonId=${currentLessonId}`)
      }
    },
    [currentConcept.step, currentLessonId, evaluation, phase, progressPct, responseMode, router, selected, shortAnswer, supabase, paused, userId],
  )

  useEffect(() => {
    if (!supabase) return

    const client = supabase
    let ignore = false

    async function loadSavedProgress() {
      const { data: authData } = await client.auth.getUser()
      const activeUser = authData.user

      if (!activeUser || ignore) return

      setUserId(activeUser.id)

      const { data: savedRow } = await client
        .from('lesson_progress')
        .select('*')
        .eq('user_id', activeUser.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (!savedRow || ignore) return

      const savedSnapshot = (savedRow.progress_state as Record<string, unknown>) ?? {}
      const savedLessonId = (savedRow.current_lesson as TeacherLessonId | undefined) ?? ((savedSnapshot.lessonId as TeacherLessonId | undefined) ?? 'ai-teacher-demo-lesson-1')
      const savedSection = (savedRow.current_section as LessonPhase | undefined) ?? ((savedSnapshot.section as LessonPhase | undefined) ?? 'teaching')
      const savedPhase = savedSection || 'teaching'
      const savedPaused = Boolean(savedRow.paused)

      setCurrentLessonId(savedLessonId)
      setPhase(savedPhase)
      setResumePhase(savedPhase)
      setPaused(savedPaused)
      setPlaying(!savedPaused)
      setResponseMode((savedSnapshot.responseMode as ResponseMode | undefined) ?? 'mcq')
      setSelected((savedSnapshot.selectedIndex as number | null | undefined) ?? null)
      setShortAnswer((savedSnapshot.shortAnswer as string | undefined) ?? '')
      setEvaluation((savedSnapshot.evaluation as TeacherEvaluation | null | undefined) ?? null)
    }

    void loadSavedProgress()
    setIsLoadingProgress(false)

    return () => {
      ignore = true
    }
  }, [supabase])

  useEffect(() => {
    if (isLoadingProgress || !userId) return
    void persistProgress(phase, paused, phase === 'continuing' && currentLessonId === 'ai-teacher-demo-lesson-2')
  }, [currentLessonId, isLoadingProgress, paused, persistProgress, phase, userId])

  useEffect(() => {
    if (phase === 'question' || phase === 'answering') {
      setCurrentVisualPayload(lesson.question.visualPayload || lesson.visualPayload)
    } else if (phase === 'evaluating' || phase === 'reexplaining') {
      setCurrentVisualPayload(evaluation?.visualPayload || lesson.question.visualPayload || lesson.visualPayload)
    } else {
      setCurrentVisualPayload(lesson.visualPayload)
    }
  }, [phase, lesson, evaluation])

  function openAskTeacher() {
    setResumePhase(phase)
    setShowAskPanel(true)
  }

  function closeAskTeacher() {
    setShowAskPanel(false)
    setAskDraft('')
    setPhase(resumePhase)
  }

  function beginQuestion() {
    setResumePhase(phase)
    setPhase('question')
    setSelected(null)
    setShortAnswer('')
    setAnswerError('')
    setEvaluation(null)
  }

  function beginEvaluating() {
    if (responseMode === 'freeform' && shortAnswer.trim().length === 0) {
      setAnswerError('Please enter an answer before submitting.')
      return
    }
    if (responseMode === 'mcq' && selected === null) {
      setAnswerError('Please select an option before submitting.')
      return
    }

    setAnswerError('')

    const hasValidFreeform = shortAnswer.trim().length >= 18
    const chosenIndex =
      selected ??
      (hasValidFreeform ? lesson.question.correctIndex : (lesson.question.correctIndex === 0 ? 1 : 0))

    const result = engine.evaluateAnswer(currentLessonId, chosenIndex)
    setEvaluation(result)
    setPhase('evaluating')
  }

  function resumeLesson() {
    setPaused(false)
    setPlaying(true)
    setPhase('teaching')
  }

  function endLesson() {
    setPlaying(false)
    setPaused(true)
    setPhase('continuing')
  }

  function continueLessonFlow() {
    const nextState = engine.continueLesson(currentLessonId)

    if (nextState.nextLessonId) {
      setCurrentLessonId(nextState.nextLessonId)
      setPhase('teaching')
      setSelected(null)
      setShortAnswer('')
      setEvaluation(null)
      setPaused(false)
      setPlaying(true)
      return
    }

    setPhase('continuing')
    setPlaying(false)
    setPaused(true)
  }

  const statusLabel: Record<LessonPhase, string> = {
    teaching: 'Teaching',
    question: 'AI asking a question',
    answering: 'Student answering',
    evaluating: 'AI evaluating',
    reexplaining: 'AI re-explaining',
    continuing: 'Continuing lesson',
  }

  const teacherNarrative =
    phase === 'teaching'
      ? lesson.teachingPrompt
      : phase === 'question'
        ? lesson.question.teacherPrompt
        : phase === 'answering'
          ? 'Take a moment to answer. There are several ways to respond.'
          : phase === 'evaluating'
            ? evaluation?.feedback ?? 'Checking the reasoning and comparing it to the lesson objective...'
            : phase === 'reexplaining'
              ? evaluation?.reexplanation ?? lesson.reexplanation
              : evaluation?.isCorrect
                ? engine.continueLesson(currentLessonId).message
                : 'Nice work. The next concept builds directly on this one.'

  const primaryActionLabel =
    phase === 'question' || phase === 'answering' || phase === 'evaluating' || phase === 'reexplaining'
      ? 'Submit answer'
      : paused
        ? 'Resume teacher'
        : 'Pause teacher'

  const isCorrectAnswer = evaluation?.isCorrect === true
  const isIncorrectAnswer = evaluation?.isCorrect === false

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-[30px] border border-white/10 bg-[#081522] shadow-[0_30px_100px_rgba(14,165,233,0.22)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.32),_transparent_38%),linear-gradient(135deg,#081522_0%,#0b172a_45%,#081522_100%)]" />
        <div className="absolute inset-0 opacity-30">
          <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[120px]" />
          <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-500/20 blur-[100px]" />
        </div>

        <div className="relative z-10 p-4 sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Badge className="gap-1.5 bg-primary/15 text-primary">Live lesson</Badge>
                <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{lesson.subtitle}</span>
              </div>
              <h1 className="text-xl font-semibold text-white sm:text-2xl">{lesson.title}</h1>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                className="h-9 rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                onClick={openAskTeacher}
              >
                <Bot className="mr-2 size-3.5" />
                Ask Teacher
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-9 w-9 rounded-full border border-white/10 bg-white/5 p-0 text-slate-200 hover:bg-white/10"
                aria-label="Toggle captions"
                onClick={() => setShowTranscript((v) => !v)}
              >
                <Captions className="size-4" />
              </Button>
            </div>
          </div>

          <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/30 px-3 py-2 text-xs text-slate-300 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Radio className={cn('size-3.5', playing ? 'text-green-400' : 'text-slate-500')} />
              <span>{statusLabel[phase]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>{currentConcept.step}/{currentConcept.totalSteps}</span>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.8fr)]">
            <div className={cn('grid gap-6', currentVisualPayload?.trim() ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1')}>
              {/* Left side: AI Avatar (Maya) - 5 columns on lg: */}
              <div className={cn('relative flex flex-col justify-between overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/40 p-4 sm:p-5', currentVisualPayload?.trim() ? 'lg:col-span-5' : 'w-full')}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.18),_transparent_50%)]" />

                {/* Top bar */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-sm">
                    <span className="relative flex size-2 rounded-full bg-green-400" />
                    Live AI teacher
                  </div>

                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-9 w-9 rounded-full border border-white/10 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                    aria-label="Volume"
                  >
                    <Volume2 className="size-4" />
                  </Button>
                </div>

                {/* Center Content: Avatar + Transcript (stacked flex-col) */}
                <div className="relative z-10 my-4 flex flex-col items-center justify-center gap-3 text-center">
                  <div className="relative flex size-24 shrink-0 items-center justify-center rounded-full border border-cyan-300/35 bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-slate-900/80 shadow-[0_0_40px_rgba(34,211,238,0.28)]">
                    <div className={cn('absolute inset-0 rounded-full border border-cyan-400/40', playing && 'animate-ping')} />
                    <div className="flex size-14 items-center justify-center rounded-full bg-slate-900/70">
                      <Bot className="size-7 text-cyan-300" />
                    </div>
                  </div>

                  <div className="flex flex-col items-center">
                    <p className="text-xs uppercase tracking-[0.26em] text-cyan-300/80">AI tutor</p>
                    <h2 className="mt-0.5 text-2xl font-semibold text-white">Maya</h2>
                  </div>

                  {/* Transcript text area with fixed max-height & overflow-y-auto */}
                  <div className="max-h-28 w-full max-w-xl overflow-y-auto rounded-xl border border-white/10 bg-slate-950/60 p-3 text-xs sm:text-sm text-slate-200 shadow-inner">
                    <p className="leading-relaxed">{teacherNarrative}</p>
                  </div>
                </div>

                {/* Bottom Controls Bar */}
                <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3">
                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      className="h-9 w-9 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
                      onClick={() => {
                        if (paused) {
                          resumeLesson()
                        } else {
                          setPaused(true)
                          setPlaying(false)
                        }
                      }}
                    >
                      {paused ? <Play className="ml-0.5 size-4" /> : <Pause className="size-4" />}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9 rounded-full border border-white/10 bg-white/5 text-xs text-slate-100 hover:bg-white/10"
                      onClick={() => setPhase('teaching')}
                    >
                      Replay
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-9 rounded-full border border-red-500/20 bg-red-500/5 text-xs text-red-200"
                      onClick={endLesson}
                    >
                      End Lesson
                    </Button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">04:12</span>
                    <div className="w-20 overflow-hidden rounded-full bg-slate-700/70 sm:w-24">
                      <div
                        className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                        style={{ width: `${Math.min(100, progressPct)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side: Visual Blackboard container (7 columns on lg:) */}
              {Boolean(currentVisualPayload?.trim()) && (
                <div className="flex flex-col justify-between overflow-hidden rounded-[24px] border border-cyan-500/25 bg-slate-900/90 p-5 shadow-xl backdrop-blur-md lg:col-span-7">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="grid size-6 place-items-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-300">
                        <Code2 className="size-3.5" />
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                        Visual Blackboard
                      </span>
                    </div>
                    <Badge variant="outline" className="border-white/10 bg-slate-950/60 font-mono text-[10px] text-slate-300">
                      {currentVisualPayload?.match(/^```([a-z]+)/i)?.[1] ?? 'code'}
                    </Badge>
                  </div>

                  <div className="my-3 flex-1 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/90 p-4">
                    <pre className="font-mono text-xs leading-relaxed text-gray-200 whitespace-pre-wrap break-words">
                      <code>
                        {currentVisualPayload?.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/i, '')}
                      </code>
                    </pre>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>Dynamic Explanation</span>
                    <span className="flex items-center gap-1 text-cyan-400/80">
                      <Sparkles className="size-3" /> Live Sync
                    </span>
                  </div>
                </div>
              )}
            </div>

            <aside className="rounded-[24px] border border-white/10 bg-slate-900/40 p-4 sm:p-5">
              <div className="mb-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current concept</p>
                <p className="mt-2 text-lg font-semibold text-white">{lesson.objective}</p>
              </div>

              <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-sm text-slate-300">
                <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-slate-400">
                  <span>Progress</span>
                  <span>{progressPct}%</span>
                </div>
                <Progress value={progressPct} className="h-2 bg-slate-800" />
              </div>

              <div className="space-y-2 text-sm text-slate-300">
                {lessonPlan.map((step) => {
                  const done = step.status === 'done'
                  const active = step.status === 'current'
                  return (
                    <div
                      key={step.id}
                      className={cn(
                        'flex items-start gap-3 rounded-2xl border px-3 py-3',
                        active ? 'border-cyan-400/30 bg-cyan-500/5' : done ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-white/10 bg-slate-950/20',
                      )}
                    >
                      <div className="mt-0.5 flex size-5 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[10px] text-slate-300">
                        {done ? <Check className="size-3 text-emerald-400" /> : step.id}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={cn('text-sm font-medium', active ? 'text-white' : 'text-slate-300')}>{step.title}</p>
                          <span className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{step.type}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-400">{step.minutes} min</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-sm text-slate-300">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  <Circle className="size-2.5 fill-emerald-400 text-emerald-400" />
                  Captions
                </div>
                {showTranscript ? (
                  <ul className="mt-3 space-y-3 text-sm text-slate-200">
                    {classroomTranscript.map((item) => (
                      <li key={item.time} className="flex gap-3">
                        <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-slate-500">{item.time}</span>
                        <span>{item.text}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-slate-400">Transcript hidden. Turn captions on to review the lesson.</p>
                )}
              </div>
            </aside>
          </div>

          <div className="mt-6 rounded-[24px] border border-white/10 bg-slate-900/40 p-4 sm:p-5">
            {phase === 'teaching' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Lesson explanation</p>
                  <Badge className="bg-cyan-500/15 text-cyan-200">Teaching</Badge>
                </div>
                <p className="text-lg font-medium text-white">{lesson.objective}</p>
                <p className="leading-relaxed text-slate-300">{lesson.summary}</p>
                <div className="grid gap-3 sm:grid-cols-3">
                  {lesson.keyPoints.map((point) => (
                    <div key={point} className="rounded-2xl border border-cyan-400/10 bg-cyan-500/5 p-3 text-sm text-slate-200">
                      {point}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white" onClick={beginQuestion}>
                    Continue to question
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                  <Button variant="secondary" className="border border-white/10 bg-white/5 text-slate-200" onClick={() => setPhase('teaching')}>
                    Repeat explanation
                  </Button>
                </div>
              </div>
            )}

            {phase === 'question' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Teacher question</p>
                  <Badge className="bg-violet-500/15 text-violet-200">Checkpoint</Badge>
                </div>
                <p className="text-lg font-medium text-white">{classroomMcq.prompt}</p>

                <div className="flex flex-wrap gap-2">
                  {(['mcq', 'freeform'] as ResponseMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setResponseMode(mode)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-xs transition-colors',
                        responseMode === mode
                          ? 'border-cyan-400/50 bg-cyan-500/10 text-cyan-100'
                          : 'border-white/10 bg-white/5 text-slate-300',
                      )}
                    >
                      {mode === 'mcq' ? 'Multiple choice' : 'Free response'}
                    </button>
                  ))}
                </div>

                {responseMode === 'mcq' ? (
                  <div className="grid gap-2.5">
                    {classroomMcq.options.map((option, index) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelected(index)
                          setPhase('answering')
                        }}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl border px-4 py-3 text-left text-sm transition-colors',
                          selected === index
                            ? 'border-cyan-400/50 bg-cyan-500/10 text-white'
                            : 'border-white/10 bg-slate-950/30 text-slate-200 hover:border-cyan-400/30',
                        )}
                      >
                        <span className="flex size-6 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs text-slate-300">
                          {String.fromCharCode(65 + index)}
                        </span>
                        {option}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-200">Answer in your own words</label>
                    <textarea
                      value={shortAnswer}
                      onChange={(e) => {
                        setShortAnswer(e.target.value)
                        if (answerError) setAnswerError('')
                      }}
                      placeholder="Answer in your own words..."
                      className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
                    />
                  </div>
                )}

                {answerError && (
                  <p className="text-sm font-medium text-amber-300">{answerError}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button variant="secondary" className="border border-white/10 bg-white/5 text-slate-200" onClick={() => setPhase('teaching')}>
                    Back to lesson
                  </Button>
                  <Button
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={beginEvaluating}
                    disabled={
                      (responseMode === 'freeform' && shortAnswer.trim().length === 0) ||
                      (responseMode === 'mcq' && selected === null)
                    }
                  >
                    Submit answer
                  </Button>
                </div>
              </div>
            )}

            {phase === 'answering' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Student response</p>
                  <Badge className="bg-cyan-500/15 text-cyan-200">Ready</Badge>
                </div>
                <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-sm text-slate-200">
                  {selected !== null ? classroomMcq.options[selected] : shortAnswer || 'Your response is being evaluated.'}
                </div>
                {answerError && (
                  <p className="text-sm text-amber-300">{answerError}</p>
                )}
                <Button
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={beginEvaluating}
                  disabled={
                    (responseMode === 'freeform' && shortAnswer.trim().length === 0) ||
                    (responseMode === 'mcq' && selected === null)
                  }
                >
                  Evaluate response
                </Button>
              </div>
            )}

            {phase === 'evaluating' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Teacher feedback</p>
                  <Badge className={cn(isCorrectAnswer ? 'bg-emerald-500/15 text-emerald-200' : 'bg-amber-500/15 text-amber-200')}>
                    {isCorrectAnswer ? 'Correct' : 'Incorrect'}
                  </Badge>
                </div>
                <div className={cn('rounded-2xl border px-4 py-4 text-sm', isCorrectAnswer ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-50' : 'border-amber-500/30 bg-amber-500/10 text-amber-50')}>
                  {evaluation?.feedback ?? 'Checking the reasoning and comparing it to the lesson objective...'}
                </div>
                {!isCorrectAnswer && (
                  <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-sm text-slate-200">
                    <p className="mb-2 text-xs uppercase tracking-[0.18em] text-slate-400">Teacher re-explaining</p>
                    <p>{evaluation?.reexplanation ?? lesson.reexplanation}</p>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                    onClick={() => {
                      if (isCorrectAnswer) {
                        setPhase('continuing')
                      } else {
                        setPhase('reexplaining')
                      }
                    }}
                  >
                    {isCorrectAnswer ? 'Next segment' : 'Continue lesson'}
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                </div>
              </div>
            )}

            {phase === 'reexplaining' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Re-explaining</p>
                  <Badge className="bg-amber-500/15 text-amber-200">Review</Badge>
                </div>
                <p className="text-lg font-medium text-white">Let’s slow this down.</p>
                <p className="leading-relaxed text-slate-300">{evaluation?.reexplanation ?? lesson.reexplanation}</p>
                <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white" onClick={() => setPhase('continuing')}>
                  Continue lesson
                </Button>
              </div>
            )}

            {phase === 'continuing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Moving forward</p>
                  <Badge className="bg-emerald-500/15 text-emerald-200">Next segment</Badge>
                </div>
                <p className="text-lg font-medium text-white">{evaluation?.isCorrect ? 'You are ready for the next concept.' : 'Let’s review the missing step and continue.'}</p>
                <p className="leading-relaxed text-slate-300">{evaluation?.isCorrect ? engine.continueLesson(currentLessonId).message : evaluation?.reexplanation ?? lesson.reexplanation}</p>
                <div className="flex flex-wrap items-center gap-3">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white" onClick={continueLessonFlow}>
                    {engine.continueLesson(currentLessonId).nextLessonId ? 'Next concept' : 'Lesson complete'}
                    <ChevronRight className="ml-2 size-4" />
                  </Button>
                  <Button variant="secondary" className="border border-white/10 bg-white/5 text-slate-200" onClick={resumeLesson}>
                    Resume
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAskPanel && (
        <div className="fixed right-4 top-20 z-50 w-[340px] rounded-[24px] border border-white/10 bg-slate-950/95 p-2 shadow-[0_30px_80px_rgba(2,6,23,0.9)] backdrop-blur-xl">
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-2 text-slate-100">
              <div className="flex size-8 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
                <Bot className="size-4" />
              </div>
              <span className="text-sm font-medium">Ask Teacher</span>
            </div>
            <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/5 p-0 text-slate-200" onClick={closeAskTeacher}>
              <X className="size-4" />
            </Button>
          </div>

          <div className="space-y-3 px-3 pb-3 pt-1">
            <button type="button" onClick={() => setAskDraft('Explain this with a simpler analogy')} className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10">
              Explain this with a simpler analogy
            </button>
            <button type="button" onClick={() => setAskDraft('Give me a real-world example')} className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10">
              Give me a real-world example
            </button>
            <button type="button" onClick={() => setAskDraft('Why does this matter?')} className="w-full rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 hover:bg-white/10">
              Why does this matter?
            </button>
            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-3 text-sm text-slate-300">
              “{lesson.summary}”
            </div>
            <div className="flex gap-2">
              <input
                value={askDraft}
                onChange={(e) => setAskDraft(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="h-11 flex-1 rounded-2xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
              />
              <Button
                className="h-11 w-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-500 p-0 text-white"
                onClick={closeAskTeacher}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
