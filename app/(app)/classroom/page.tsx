'use client'

import { useState } from 'react'
import {
  Bot,
  Captions,
  Check,
  ChevronRight,
  Circle,
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
import { classroomMcq, classroomTranscript, currentConcept, lessonPlan } from '@/lib/mock-data'

type LessonPhase =
  | 'teaching'
  | 'question'
  | 'answering'
  | 'evaluating'
  | 'reexplaining'
  | 'continuing'

type ResponseMode = 'mcq' | 'freeform'

export default function ClassroomPage() {
  const [playing, setPlaying] = useState(true)
  const [paused, setPaused] = useState(false)
  const [phase, setPhase] = useState<LessonPhase>('teaching')
  const [responseMode, setResponseMode] = useState<ResponseMode>('mcq')
  const [selected, setSelected] = useState<number | null>(null)
  const [shortAnswer, setShortAnswer] = useState('')
  const [showTranscript, setShowTranscript] = useState(false)
  const [showAskPanel, setShowAskPanel] = useState(false)
  const [resumePhase, setResumePhase] = useState<LessonPhase>('teaching')
  const [askDraft, setAskDraft] = useState('')

  const progressPct = Math.round((currentConcept.step / currentConcept.totalSteps) * 100)
  const isCorrect = selected === classroomMcq.correctIndex

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
  }

  function beginEvaluating() {
    setPhase('evaluating')
    setTimeout(() => {
      if (selected === classroomMcq.correctIndex || shortAnswer.trim().length >= 18) {
        setPhase('continuing')
      } else {
        setPhase('reexplaining')
      }
    }, 1200)
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

  const statusLabel: Record<LessonPhase, string> = {
    teaching: 'Teaching',
    question: 'AI asking a question',
    answering: 'Student answering',
    evaluating: 'AI evaluating',
    reexplaining: 'AI re-explaining',
    continuing: 'Continuing lesson',
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-6">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#081522] shadow-[0_30px_100px_rgba(14,165,233,0.28)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.28),_transparent_40%),linear-gradient(135deg,#081522_0%,#0b172a_45%,#081522_100%)]" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-cyan-400/20 blur-[120px]" />
            <div className="absolute bottom-0 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-blue-500/20 blur-[100px]" />
          </div>

          <div className="relative z-10 p-4 sm:p-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <Badge className="gap-1.5 bg-primary/15 text-primary">Live lesson</Badge>
                  <span className="text-xs uppercase tracking-[0.2em] text-slate-400">{currentConcept.lesson}</span>
                </div>
                <h1 className="text-xl font-semibold text-white sm:text-2xl">{currentConcept.title}</h1>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-9 rounded-full border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                  onClick={openAskTeacher}
                >
                  <Bot className="mr-2 size-3.5" />
                  Ask AI Teacher
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

            <div className="mb-4 rounded-2xl border border-white/10 bg-slate-900/30 p-2.5">
              {phase === 'question' || phase === 'answering' || phase === 'evaluating' || phase === 'reexplaining' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    className="h-9 rounded-full border border-white/10 bg-white/5 text-slate-100"
                    onClick={() => setPhase(resumePhase)}
                  >
                    Back to lesson
                  </Button>
                  <Button
                    className="h-9 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                    onClick={beginEvaluating}
                  >
                    Submit answer
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="h-9 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                    onClick={() => {
                      setPaused(false)
                      setPlaying(true)
                      setPhase('teaching')
                    }}
                  >
                    {paused ? 'Resume' : 'Pause Teacher'}
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-9 rounded-full border border-white/10 bg-white/5 text-slate-100"
                    onClick={openAskTeacher}
                  >
                    Ask Teacher
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-9 rounded-full border border-white/10 bg-white/5 text-slate-100"
                    onClick={() => setPhase('teaching')}
                  >
                    Repeat Explanation
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-9 rounded-full border border-red-500/20 bg-red-500/5 text-red-200"
                    onClick={endLesson}
                  >
                    End Lesson
                  </Button>
                </div>
              )}
            </div>

            <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-slate-900/30 px-3 py-2 text-xs text-slate-300 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Radio className={cn('size-3.5', playing ? 'text-green-400' : 'text-slate-500')} />
                <span>{statusLabel[phase]}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Section {currentConcept.step}</span>
                <span className="text-slate-500">/</span>
                <span>{currentConcept.totalSteps}</span>
              </div>
            </div>

            <div className="relative aspect-video overflow-hidden rounded-[24px] border border-white/10 bg-slate-950/40">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.18),_transparent_50%)]" />

              <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-sm">
                <span className="relative flex size-2 rounded-full bg-green-400" />
                Live AI teacher
              </div>

              <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-9 w-9 rounded-full border border-white/10 bg-slate-900/60 text-slate-200 hover:bg-slate-800"
                  aria-label="Volume"
                >
                  <Volume2 className="size-4" />
                </Button>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center">
                <div className="relative flex size-28 items-center justify-center rounded-full border border-cyan-300/35 bg-gradient-to-br from-cyan-400/20 via-blue-500/20 to-slate-900/80 shadow-[0_0_50px_rgba(34,211,238,0.28)]">
                  <div className={cn('absolute inset-0 rounded-full border border-cyan-400/40', playing && 'animate-ping')} />
                  <div className="flex size-16 items-center justify-center rounded-full bg-slate-900/70">
                    <Bot className="size-8 text-cyan-300" />
                  </div>
                </div>

                <div className="max-w-xl px-4">
                  <p className="text-xs uppercase tracking-[0.26em] text-cyan-300/80">AI tutor</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Maya</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    {phase === 'teaching' && 'Today we are tracing how a tiny neural network turns inputs into predictions.'}
                    {phase === 'question' && 'I want to check your understanding before we move on.'}
                    {phase === 'answering' && 'Take a moment to answer. There are several ways to respond.'}
                    {phase === 'evaluating' && 'Let me assess your answer and decide what to revisit.'}
                    {phase === 'reexplaining' && 'I’ll simplify the idea and connect it back to the worked example.'}
                    {phase === 'continuing' && 'Nice work. The next concept builds directly on this one.'}
                  </p>
                </div>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 flex items-center gap-3 bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent px-4 pb-4 pt-10">
                <Button
                  size="icon"
                  className="h-11 w-11 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20"
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
                  className="h-11 rounded-full border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
                  onClick={endLesson}
                >
                  End lesson
                </Button>

                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-slate-400">04:12</span>
                  <div className="w-28 overflow-hidden rounded-full bg-slate-700/70">
                    <div
                      className="h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500"
                      style={{ width: `${Math.min(100, progressPct)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,0.9fr)]">
              <div className="rounded-[24px] border border-white/10 bg-slate-900/40 p-4 sm:p-5">
                {phase === 'teaching' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Teaching</p>
                      <Badge className="bg-cyan-500/15 text-cyan-200">Concept explanation</Badge>
                    </div>
                    <p className="text-lg font-medium text-white">Why does the network use a bias term?</p>
                    <p className="leading-relaxed text-slate-300">
                      A bias lets every neuron shift its output independently of the incoming inputs. That means the model can move its decision boundary around the page, not just along whatever the input features dictate.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {currentConcept.keyPoints.map((point) => (
                        <div key={point} className="rounded-2xl border border-cyan-400/10 bg-cyan-500/5 p-3 text-sm text-slate-200">
                          {point}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white" onClick={beginQuestion}>
                        Continue to question
                        <ChevronRight className="ml-2 size-4" />
                      </Button>
                      <Button variant="secondary" className="border border-white/10 bg-white/5 text-slate-200">Replay explanation</Button>
                    </div>
                  </div>
                )}

                {phase === 'question' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Question</p>
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
                          {mode === 'mcq' ? 'Multiple choice' : 'Answer in your own words'}
                        </button>
                      ))}
                    </div>

                    {responseMode === 'mcq' ? (
                      <div className="grid gap-2.5">
                        {classroomMcq.options.map((option, index) => (
                          <button
                            key={option}
                            type="button"
                            onClick={() => { setSelected(index); setPhase('answering') }}
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
                      <textarea
                        value={shortAnswer}
                        onChange={(e) => setShortAnswer(e.target.value)}
                        placeholder="Answer in your own words..."
                        className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
                      />
                    )}

                    <div className="flex items-center justify-between gap-3">
                      <Button variant="secondary" className="border border-white/10 bg-white/5 text-slate-200" onClick={() => setPhase('teaching')}>
                        Back to teaching
                      </Button>
                      <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white" onClick={beginEvaluating}>
                        Submit answer
                      </Button>
                    </div>
                  </div>
                )}

                {phase === 'answering' && (
                  <div className="space-y-4">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Student answering</p>
                    <p className="text-lg font-medium text-white">Your answer is ready. The AI teacher is evaluating it.</p>
                    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-500/5 p-4 text-sm text-slate-200">
                      {selected !== null ? classroomMcq.options[selected] : shortAnswer || 'Your response is being evaluated.'}
                    </div>
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white" onClick={beginEvaluating}>
                      Evaluate response
                    </Button>
                  </div>
                )}

                {phase === 'evaluating' && (
                  <div className="space-y-4">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">AI evaluating</p>
                    <div className="flex items-center gap-3 rounded-2xl border border-violet-400/20 bg-violet-500/10 px-4 py-5 text-violet-50">
                      <div className="flex size-8 items-center justify-center rounded-full bg-violet-500/20">
                        <Sparkles className="size-4" />
                      </div>
                      Checking the reasoning and comparing it to the lesson objective...
                    </div>
                  </div>
                )}

                {phase === 'reexplaining' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">AI re-explaining</p>
                      <Badge className="bg-amber-500/15 text-amber-200">Reinforce concept</Badge>
                    </div>
                    <p className="text-lg font-medium text-white">Let’s slow this down.</p>
                    <p className="leading-relaxed text-slate-300">
                      Think of the bias as a starting offset. Even when all the inputs are zero, the neuron still has a baseline value. That is why the model can shift its decision boundary and learn patterns that aren’t locked to the origin.
                    </p>
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white" onClick={() => setPhase('continuing')}>
                      Continue lesson
                    </Button>
                  </div>
                )}

                {phase === 'continuing' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">Continuing lesson</p>
                      <Badge className="bg-emerald-500/15 text-emerald-200">Great progress</Badge>
                    </div>
                    <p className="text-lg font-medium text-white">You’re ready for the next segment.</p>
                    <p className="leading-relaxed text-slate-300">
                      The next concept — loss functions and gradient descent — uses the same idea, but measures how far the prediction is from the target before adjusting the weights.
                    </p>
                    <div className="flex items-center gap-3">
                      <Button className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
                        Next concept
                        <ChevronRight className="ml-2 size-4" />
                      </Button>
                      <Button variant="secondary" className="border border-white/10 bg-white/5 text-slate-200" onClick={resumeLesson}>
                        Resume
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-[24px] border border-white/10 bg-slate-900/40 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Lesson progress</p>
                    <p className="mt-1 text-lg font-semibold text-white">{progressPct}% complete</p>
                  </div>
                  <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200">
                    {currentConcept.step}/{currentConcept.totalSteps}
                  </div>
                </div>
                <Progress value={progressPct} className="h-2 bg-slate-800" />

                <div className="mt-5 space-y-2">
                  {lessonPlan.map((step) => {
                    const active = step.id === currentConcept.step
                    const done = step.status === 'done'
                    const upcoming = step.status === 'upcoming'

                    return (
                      <div
                        key={step.id}
                        className={cn(
                          'flex items-start gap-3 rounded-2xl border px-3 py-3',
                          active ? 'border-cyan-400/30 bg-cyan-500/5' : 'border-white/10 bg-slate-950/20',
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
                          <p className={cn('mt-1 text-xs', upcoming ? 'text-slate-500' : 'text-slate-400')}>{step.minutes} min</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-sm text-slate-300">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-slate-400">
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
                    <p className="mt-3 text-slate-400">Captions are hidden. Toggle to review the live transcript.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <aside className="relative xl:pt-6">
        <div className="rounded-[24px] border border-white/10 bg-slate-900/50 p-4 shadow-[0_20px_50px_rgba(15,23,42,0.45)] backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current lesson</p>
              <p className="mt-1 text-base font-semibold text-white">{currentConcept.title}</p>
            </div>
            <Button variant="secondary" className="h-9 rounded-full border border-white/10 bg-white/5 text-slate-200" onClick={openAskTeacher}>
              Ask
            </Button>
          </div>

          <div className="mb-4 rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-sm text-slate-300">
            <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
              <span>Session</span>
              <span>{progressPct}%</span>
            </div>
            <Progress value={progressPct} className="h-2 bg-slate-800" />
          </div>

          <div className="mb-4 space-y-2 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2.5">
              <span>Pause Teacher</span>
              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full border border-white/10 bg-white/5 p-0 text-slate-200" onClick={() => { setPaused(true); setPlaying(false); }}>
                <Pause className="size-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2.5">
              <span>Resume</span>
              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full border border-white/10 bg-white/5 p-0 text-slate-200" onClick={resumeLesson}>
                <Play className="ml-0.5 size-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2.5">
              <span>Repeat Explanation</span>
              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full border border-white/10 bg-white/5 p-0 text-slate-200" onClick={() => setPhase('teaching')}>
                <Radio className="size-3.5" />
              </Button>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/30 px-3 py-2.5">
              <span>End Lesson</span>
              <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full border border-red-500/20 bg-red-500/5 p-0 text-red-300" onClick={endLesson}>
                <X className="size-3.5" />
              </Button>
            </div>
          </div>

          {showAskPanel && (
            <div className="fixed right-4 top-20 z-50 w-[340px] rounded-[24px] border border-white/10 bg-slate-950/95 p-2 shadow-[0_30px_80px_rgba(2,6,23,0.9)] backdrop-blur-xl">
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center gap-2 text-slate-100">
                  <div className="flex size-8 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-300">
                    <Bot className="size-4" />
                  </div>
                  <span className="text-sm font-medium">Ask AI Teacher</span>
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
                  “The bias acts like a starting offset. Without it, the network would always be forced through the origin, which makes many patterns harder to learn.”
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
      </aside>
    </div>
  )
}
