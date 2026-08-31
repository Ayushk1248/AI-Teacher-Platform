import {
  Check,
  Play,
  Clock,
  BookOpen,
  FlaskConical,
  Dumbbell,
  CircleCheckBig,
  Layers,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LinkButton } from '@/components/ui/link-button'
import { PageHeader } from '@/components/app/page-header'
import { lessonPlan, type LessonStep } from '@/lib/mock-data'

const typeMeta: Record<
  LessonStep['type'],
  { icon: typeof BookOpen; variant: 'default' | 'accent' | 'warning' | 'success' }
> = {
  Concept: { icon: BookOpen, variant: 'default' },
  Example: { icon: FlaskConical, variant: 'accent' },
  Practice: { icon: Dumbbell, variant: 'warning' },
  Checkpoint: { icon: CircleCheckBig, variant: 'success' },
}

export default function LessonPlanPage() {
  const totalMinutes = lessonPlan.reduce((sum, step) => sum + step.minutes, 0)
  const doneCount = lessonPlan.filter((s) => s.status === 'done').length

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Your lesson plan"
        title="Neural Networks & Deep Learning"
        description="Lumina built this plan from your material and personalization. Each step flows into the next."
        actions={
          <LinkButton
            href="/classroom"
            size="lg"
            className="h-10 gap-2 bg-gradient-to-r from-primary to-accent px-4 text-primary-foreground"
          >
            <Play className="size-4" />
            Start Lesson
          </LinkButton>
        }
      />

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { icon: Layers, label: 'Steps', value: `${lessonPlan.length}` },
          { icon: Clock, label: 'Total time', value: `${totalMinutes} min` },
          { icon: Check, label: 'Completed', value: `${doneCount}/${lessonPlan.length}` },
        ].map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label}>
              <CardContent className="flex items-center gap-3 p-5">
                <span className="grid size-10 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-semibold">{item.value}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Steps timeline */}
      <ol className="relative flex flex-col gap-3">
        {lessonPlan.map((step, index) => {
          const meta = typeMeta[step.type]
          const Icon = meta.icon
          const isLast = index === lessonPlan.length - 1
          return (
            <li key={step.id} className="relative flex gap-4">
              {/* connector */}
              <div className="flex flex-col items-center">
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-full border transition-colors ${
                    step.status === 'done'
                      ? 'border-success/40 bg-success/15 text-success'
                      : step.status === 'current'
                        ? 'border-primary bg-primary/20 text-primary'
                        : 'border-border bg-card text-muted-foreground'
                  }`}
                >
                  {step.status === 'done' ? (
                    <Check className="size-5" />
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </span>
                {!isLast && <span className="my-1 w-px flex-1 bg-border" />}
              </div>

              <Card
                className={`mb-1 flex-1 transition-colors ${
                  step.status === 'current' ? 'border-primary/50 glow-border' : ''
                }`}
              >
                <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-border bg-muted/40 text-muted-foreground">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={meta.variant}>{step.type}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3.5" />
                        {step.minutes} min
                      </span>
                      {step.status === 'current' && (
                        <Badge variant="default">In progress</Badge>
                      )}
                    </div>
                    <h3 className="mt-2 font-medium">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </li>
          )
        })}
      </ol>

      <div className="flex justify-center">
        <LinkButton
          href="/classroom"
          size="lg"
          className="h-11 gap-2 bg-gradient-to-r from-primary to-accent px-6 text-base text-primary-foreground"
        >
          <Play className="size-4" />
          Start Lesson in AI Classroom
        </LinkButton>
      </div>
    </div>
  )
}
