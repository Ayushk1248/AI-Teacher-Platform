import Link from 'next/link'
import { ArrowRight, BookOpen, Brain, Clock, LineChart, Play, Sparkles, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { PageHeader } from '@/components/app/page-header'
import { auth } from '@/auth'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const accentMap = {
  primary: 'from-primary/20 to-primary/5 text-primary',
  accent: 'from-accent/20 to-accent/5 text-accent',
  success: 'from-success/20 to-success/5 text-success',
  warning: 'from-warning/20 to-warning/5 text-warning',
} as const

type DashboardCourse = {
  id: string
  title: string
  subject: string
  progress: number
  lessonsDone: number
  lessonsTotal: number
  accent: 'primary' | 'accent' | 'success' | 'warning'
}

type DashboardStat = {
  label: string
  value: string
  delta: string
  icon: typeof BookOpen
}

type DashboardRecommendation = {
  title: string
  subject: string
  minutes: number
  reason: string
}

function dayDiffFromToday(date: string | null | undefined) {
  if (!date) return 0

  const now = new Date()
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const targetDay = new Date(date)
  const normalizedDate = new Date(targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate())

  const diffInMs = currentDay.getTime() - normalizedDate.getTime()
  return Math.max(0, Math.floor(diffInMs / (1000 * 60 * 60 * 24)))
}

function getStudyStreakDays(completedDates: Array<string | null | undefined>) {
  const uniqueDates = [...new Set(completedDates.filter(Boolean).map((value) => value!.slice(0, 10)))].sort().reverse()

  if (uniqueDates.length === 0) {
    return 0
  }

  let streak = 0
  const today = new Date()
  let cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  const normalized = new Set(uniqueDates)

  while (normalized.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export default async function DashboardPage() {
  const session = await auth()
  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'
  const supabase = await createSupabaseServerClient()
  const userId = session?.user?.id

  let continueLearning: DashboardCourse[] = []
  let dashboardStats: DashboardStat[] = [
    { label: 'Lessons completed', value: '0', delta: 'Start your first lesson', icon: BookOpen },
    { label: 'Study streak', value: '0 days', delta: 'No streak yet', icon: Sparkles },
    { label: 'Avg. assessment', value: '—', delta: 'No quiz score yet', icon: LineChart },
    { label: 'Concepts mastered', value: '0', delta: 'Your first milestone is waiting', icon: Brain },
  ]
  let recommendedTopic: DashboardRecommendation = {
    title: 'No lesson selected yet',
    subject: 'Starter',
    minutes: 0,
    reason: 'Finish your first lesson to unlock your next recommendation.',
  }
  let recentLearning: Array<{ id: string; title: string; description: string; detail: string; timestamp: string }> = []

  if (userId && supabase) {
    const { data: userCourseRows } = await supabase
      .from('user_courses')
      .select('course_id')
      .eq('user_id', userId)

    let courseIds = (userCourseRows ?? []).map((row) => row.course_id).filter(Boolean) as string[]

    if (courseIds.length === 0) {
      const { data: defaultCourses } = await supabase
        .from('courses')
        .select('*')
        .eq('is_default', true)
        .eq('title', 'AI Teacher Demo')
        .limit(1)

      const defaultCourse = defaultCourses?.[0]

      if (defaultCourse) {
        const { error } = await supabase
          .from('user_courses')
          .upsert(
            { user_id: userId, course_id: defaultCourse.id },
            { onConflict: 'user_id,course_id' },
          )

        if (!error) {
          courseIds = [defaultCourse.id]
        }
      }
    }

    if (courseIds.length > 0) {
      const { data: courseRows } = await supabase
        .from('courses')
        .select('*')
        .in('id', courseIds)
        .order('created_at', { ascending: true })

      const courses = courseRows ?? []
      const allCourseIds = courses.map((course) => course.id)

      const { data: lessonRows } = allCourseIds.length
        ? await supabase
            .from('lessons')
            .select('*')
            .in('course_id', allCourseIds)
            .order('order_index', { ascending: true })
        : { data: [] }

      const lessonIds = (lessonRows ?? []).map((lesson) => lesson.id)

      const { data: progressRows } = lessonIds.length
        ? await supabase
            .from('lesson_progress')
            .select('*')
            .eq('user_id', userId)
            .in('lesson_id', lessonIds)
        : { data: [] }

      const { data: assessmentRows } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const lessonMap = new Map((lessonRows ?? []).map((lesson) => [lesson.id, lesson]))
      const progressMap = new Map((progressRows ?? []).map((row) => [row.lesson_id, row]))

      continueLearning = (courses ?? []).map((course) => {
        const courseLessons = (lessonRows ?? []).filter((lesson) => lesson.course_id === course.id)
        const totalLessons = courseLessons.length
        const completedLessons = courseLessons.filter((lesson) => {
          const progressRow = progressMap.get(lesson.id)
          return progressRow && progressRow.status === 'completed'
        }).length

        const progressValue = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

        return {
          id: course.id,
          title: course.title,
          subject: course.is_default ? 'Starter Course' : 'Course',
          progress: progressValue,
          lessonsDone: completedLessons,
          lessonsTotal: totalLessons,
          accent: 'primary',
        }
      })

      const completedCount = (progressRows ?? []).filter((row) => row.status === 'completed').length
      const avgAssessment = assessmentRows && assessmentRows.length > 0
        ? Math.round(
            assessmentRows.reduce((sum, row) => sum + Number(row.score || 0), 0) / assessmentRows.length,
          )
        : null

      const completedDates = (progressRows ?? [])
        .filter((row) => row.status === 'completed' && row.completed_at)
        .map((row) => row.completed_at)

      const streakDays = getStudyStreakDays(completedDates)

      const nextLesson = (lessonRows ?? []).find((lesson) => {
        const progressRow = progressMap.get(lesson.id)
        return !progressRow || progressRow.status !== 'completed'
      })

      dashboardStats = [
        { label: 'Lessons completed', value: String(completedCount), delta: completedCount > 0 ? 'Nice momentum' : 'Start your first lesson', icon: BookOpen },
        { label: 'Study streak', value: `${streakDays} day${streakDays === 1 ? '' : 's'}`, delta: streakDays > 0 ? 'Keep it going' : 'No streak yet', icon: Sparkles },
        { label: 'Avg. assessment', value: avgAssessment === null ? '—' : `${avgAssessment}%`, delta: avgAssessment === null ? 'No quiz score yet' : 'Based on your latest quiz history', icon: LineChart },
        { label: 'Concepts mastered', value: String(completedCount), delta: completedCount > 0 ? 'You are building momentum' : 'First milestone is waiting', icon: Brain },
      ]

      if (nextLesson) {
        recommendedTopic = {
          title: nextLesson.title,
          subject: courses.find((course) => course.id === nextLesson.course_id)?.is_default ? 'Starter Course' : 'Course',
          minutes: 10,
          reason: 'This lesson is next in your learning path and matches your recent progress.',
        }
      }

      const activityEntries = [
        ...(assessmentRows ?? []).map((row) => {
          const lesson = row.lesson_id ? lessonMap.get(row.lesson_id) : null
          return {
            id: row.id,
            title: lesson ? lesson.title : 'Assessment',
            description: 'Assessment completed',
            detail: `${Number(row.score || 0)}% score`,
            timestamp: row.created_at,
          }
        }),
        ...(progressRows ?? [])
          .filter((row) => row.status === 'completed' && row.completed_at)
          .map((row) => ({
            id: row.id,
            title: lessonMap.get(row.lesson_id)?.title ?? 'Lesson completed',
            description: 'Lesson completed',
            detail: 'Course progress updated',
            timestamp: row.completed_at,
          })),
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 3)

      recentLearning = activityEntries.map((entry) => ({
        ...entry,
        timestamp: new Date(entry.timestamp).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        }),
      }))
    }
  }

  if (continueLearning.length === 0) {
    continueLearning = [
      {
        id: 'ai-teacher-demo-empty',
        title: 'AI Teacher Demo',
        subject: 'Starter Course',
        progress: 0,
        lessonsDone: 0,
        lessonsTotal: 2,
        accent: 'primary',
      },
    ]
  }

  const streakText = dashboardStats[1]?.value ?? '0 days'
  const descriptionText = streakText === '0 days'
    ? 'Start your first lesson to begin building momentum.'
    : `You're on a ${streakText} streak. Pick up where you left off or start a fresh lesson.`

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`Welcome back, ${firstName}`}
        title="Ready to learn something new?"
        description={descriptionText}
        actions={
          <LinkButton
            href="/start"
            size="lg"
            className="h-10 gap-2 bg-gradient-to-r from-primary to-accent px-4 text-primary-foreground"
          >
            <Sparkles className="size-4" />
            Start New Lesson
          </LinkButton>
        }
      />

      <section aria-label="Progress stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight">{stat.value}</p>
                  <p className="mt-1 text-xs text-success">{stat.delta}</p>
                </div>
                <span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-label="Continue learning" className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Continue learning</h2>
            <Link
              href="/progress/path"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              View all
              <ArrowRight className="size-4" />
            </Link>
          </div>
          <div className="flex flex-col gap-4">
            {continueLearning.map((course) => (
              <Card key={course.id} className="transition-colors hover:border-primary/40">
                <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                  <span
                    className={`grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${accentMap[course.accent]}`}
                  >
                    <Play className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{course.subject}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {course.lessonsDone}/{course.lessonsTotal} lessons
                      </span>
                    </div>
                    <h3 className="mt-2 truncate font-medium">{course.title}</h3>
                    <div className="mt-3 flex items-center gap-3">
                      <Progress value={course.progress} className="h-1.5" />
                      <span className="w-10 shrink-0 text-right text-xs font-medium text-muted-foreground">
                        {course.progress}%
                      </span>
                    </div>
                  </div>
                  <LinkButton
                    href="/classroom"
                    variant="outline"
                    size="lg"
                    className="h-9 shrink-0 gap-1.5"
                  >
                    Resume
                    <ArrowRight className="size-4" />
                  </LinkButton>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section aria-label="Recommended topic" className="flex flex-col gap-6">
          <h2 className="text-lg font-semibold">Recommended for you</h2>
          <Card className="relative overflow-hidden glow-border">
            <div className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-primary/20 blur-2xl" />
            <CardContent className="relative flex flex-col gap-4 p-5">
              <Badge className="w-fit gap-1.5">
                <TrendingUp className="size-3.5" />
                Recommended
              </Badge>
              <div>
                <p className="text-sm text-muted-foreground">{recommendedTopic.subject}</p>
                <h3 className="mt-1 text-lg font-semibold">{recommendedTopic.title}</h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {recommendedTopic.reason}
              </p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="size-4" />
                {recommendedTopic.minutes > 0 ? `${recommendedTopic.minutes} min lesson` : 'No lesson scheduled yet'}
              </div>
              <LinkButton
                href="/lesson-plan"
                className="mt-1 w-full justify-center gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                <Play className="size-4" />
                Start lesson
              </LinkButton>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-3 p-5">
              <h3 className="font-medium">Recent learning</h3>
              {recentLearning.length > 0 ? (
                <div className="space-y-3">
                  {recentLearning.map((item) => (
                    <div key={item.id} className="rounded-lg border border-white/10 bg-white/5 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.timestamp}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{item.description}</p>
                      <p className="mt-2 text-xs text-primary">{item.detail}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your recent learning activity will appear here after your first lesson or quiz.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
