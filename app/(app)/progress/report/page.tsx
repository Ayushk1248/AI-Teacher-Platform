import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
  Waypoints,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { PageHeader } from '@/components/app/page-header'
import { auth } from '@/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { MockTeacherEngine } from '@/lib/teacher-engine'
import type { TeacherLessonId } from '@/lib/teacher-engine'

// ─── Types ────────────────────────────────────────────────────────────────────

type AreaStat = { area: string; mastery: number }
type ReportRow = {
  id: string
  lesson_key: TeacherLessonId
  score: number
  correct: number
  total: number
  time_spent: string
  strong: AreaStat[]
  weak: AreaStat[]
  recommendations: string[]
  created_at: string
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function getLatestReport(userId: string): Promise<ReportRow | null> {
  const supabase = await createSupabaseServerClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('assessment_results')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return data as ReportRow
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function LearningReportPage() {
  const session = await auth()
  const userId  = session?.user?.id

  const report  = userId ? await getLatestReport(userId) : null
  const engine  = new MockTeacherEngine()

  // If we have a real report, derive next-lesson info from the engine
  const nextLesson = report
    ? await (async () => {
        try {
          const cont = await engine.continueLesson(report.lesson_key)
          return cont.nextLessonId ? await engine.getLessonById(cont.nextLessonId) : null
        } catch {
          return null
        }
      })()
    : null

  const hasWeak = (report?.weak?.length ?? 0) > 0

  // ── No report yet ──
  if (!report) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Progress"
          title="Learning Report"
          description="Complete an assessment after a lesson to see your detailed results here."
        />
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="flex flex-col items-center gap-6 p-10 text-center">
            <span className="grid size-16 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="size-8" />
            </span>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">No report yet</h2>
              <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
                Finish a lesson, complete the assessment, and your learning report will appear here with strengths, weak areas, and recommendations.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <LinkButton
                href="/classroom"
                size="lg"
                className="h-11 gap-2 bg-gradient-to-r from-primary to-accent px-5 text-primary-foreground"
              >
                <BookOpen className="size-4" />
                Start a lesson
              </LinkButton>
              <LinkButton href="/progress/path" variant="outline" size="lg" className="h-11 px-5">
                View learning path
              </LinkButton>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scorePct = report.score
  const lessonTitle = await (async () => {
    try { return (await engine.getLessonById(report.lesson_key)).title }
    catch { return 'Your lesson' }
  })()

  // ── Report view ──
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Progress"
        title="Learning Report"
        description={`Results for "${lessonTitle}" — completed ${new Date(report.created_at).toLocaleDateString()}.`}
      />

      {/* Breadcrumb trail */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-primary">Lesson complete</span>
        <ArrowRight className="size-4" />
        <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-primary">Assessment</span>
        <ArrowRight className="size-4" />
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-medium text-primary">Learning report</span>
      </div>

      {/* Score hero */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Session result</p>
            <p className="mt-1 text-4xl font-semibold tracking-tight">{scorePct}%</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {report.correct} of {report.total} correct · {report.time_spent}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-success">
              <CheckCircle2 className="size-4" />
              {report.correct} correct
            </div>
            <div className="flex items-center gap-1.5 text-destructive">
              <span className="text-destructive">✗</span>
              {report.total - report.correct} missed
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <section aria-label="Session overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { icon: Target,       label: 'Score',       value: `${scorePct}%`                  },
          { icon: CheckCircle2, label: 'Correct',      value: `${report.correct}/${report.total}` },
          { icon: Clock,        label: 'Time spent',   value: report.time_spent               },
          { icon: TrendingUp,   label: 'Avg. mastery', value: `${scorePct}%`                  },
        ].map(({ icon: Icon, label, value }) => (
          <Card key={label} className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="flex items-center gap-3 p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="text-xl font-semibold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      {/* Strong / Weak */}
      <div className="grid gap-6 lg:grid-cols-2">
        {report.strong.length > 0 && (
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" />
                <h2 className="font-semibold">Strong areas</h2>
              </div>
              {report.strong.map((item) => (
                <div key={item.area} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.area}</span>
                    <Badge variant="success">{item.mastery}%</Badge>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
                    <div className="h-full rounded-full bg-success" style={{ width: `${item.mastery}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {hasWeak && (
          <Card>
            <CardContent className="flex flex-col gap-4 p-5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-warning" />
                <h2 className="font-semibold">Needs revision</h2>
              </div>
              {report.weak.map((item) => (
                <div key={item.area} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span>{item.area}</span>
                    <Badge variant="warning">{item.mastery}%</Badge>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary/60">
                    <div className="h-full rounded-full bg-warning" style={{ width: `${item.mastery}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recommendations */}
      {report.recommendations.length > 0 && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" />
              <h2 className="font-semibold">Revision guide</h2>
            </div>
            <ol className="flex flex-col gap-3">
              {report.recommendations.map((rec, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed text-muted-foreground">{rec}</span>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* Next topic */}
      {nextLesson && (
        <Card>
          <CardContent className="flex flex-col gap-4 p-5">
            <div className="flex items-center gap-2">
              <ArrowRight className="size-4 text-accent" />
              <h2 className="font-semibold">Suggested next topic</h2>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-lg font-semibold">{nextLesson.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{nextLesson.objective}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action bar — stays in learning journey */}
      <div className="rounded-2xl border border-border bg-card/40 p-5">
        <p className="mb-4 text-sm font-medium">What would you like to do next?</p>
        <div className="flex flex-wrap gap-3">
          {hasWeak && (
            <LinkButton
              href="/classroom"
              size="lg"
              className="h-11 gap-2 bg-gradient-to-r from-primary to-accent px-5 text-primary-foreground"
            >
              <RefreshCw className="size-4" />
              Revise Weak Area
            </LinkButton>
          )}
          <LinkButton
            href="/classroom"
            size="lg"
            variant={hasWeak ? 'outline' : undefined}
            className={!hasWeak ? 'h-11 gap-2 bg-gradient-to-r from-primary to-accent px-5 text-primary-foreground' : 'h-11 gap-2 px-5'}
          >
            <BookOpen className="size-4" />
            Start Next Lesson
          </LinkButton>
          <LinkButton
            href="/progress/path"
            size="lg"
            variant="secondary"
            className="h-11 gap-2 px-5"
          >
            <Waypoints className="size-4" />
            View Learning Path
          </LinkButton>
        </div>
      </div>
    </div>
  )
}
