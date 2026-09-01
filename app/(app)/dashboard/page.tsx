import Link from 'next/link'
import { ArrowRight, Clock, Play, Sparkles, TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { LinkButton } from '@/components/ui/link-button'
import { PageHeader } from '@/components/app/page-header'
import { continueLearning, stats, recommendedTopic } from '@/lib/mock-data'
import { auth } from '@/auth'

const accentMap = {
  primary: 'from-primary/20 to-primary/5 text-primary',
  accent: 'from-accent/20 to-accent/5 text-accent',
  success: 'from-success/20 to-success/5 text-success',
  warning: 'from-warning/20 to-warning/5 text-warning',
} as const

export default async function DashboardPage() {
  const session = await auth()
  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'
  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={`Welcome back, ${firstName}`}
        title="Ready to learn something new?"
        description="You're on a 12-day streak. Pick up where you left off or start a fresh lesson."
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

      {/* Stats */}
      <section aria-label="Progress stats" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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
        {/* Continue learning */}
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

        {/* Recommended */}
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
                {recommendedTopic.minutes} min lesson
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
              <h3 className="font-medium">Weekly goal</h3>
              <div className="flex items-center gap-3">
                <Progress value={72} className="h-2" />
                <span className="text-sm font-medium text-muted-foreground">72%</span>
              </div>
              <p className="text-sm text-muted-foreground">
                3.6 of 5 hours completed this week. Keep it up!
              </p>
              <Button variant="outline" className="mt-1 w-full justify-center">
                Adjust goal
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
