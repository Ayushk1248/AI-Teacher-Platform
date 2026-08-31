import { ArrowRight } from 'lucide-react'
import { LinkButton } from '@/components/ui/link-button'

export function CtaSection() {
  return (
    <section id="cta" className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 px-6 py-16 text-center sm:px-12 glow-border">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(60%_60%_at_50%_40%,black,transparent)]" />
        <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary/25 blur-3xl" />
        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Your personal AI teacher is ready
          </h2>
          <p className="mt-4 text-pretty text-muted-foreground">
            Start with any topic or upload your own material. In minutes you&apos;ll have a
            personalized lesson plan and a classroom that adapts to you.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <LinkButton
              href="/login"
              size="lg"
              className="h-11 bg-gradient-to-r from-primary to-accent px-5 text-base text-primary-foreground"
            >
              Create your first lesson
              <ArrowRight />
            </LinkButton>
            <LinkButton
              href="/login"
              variant="outline"
              size="lg"
              className="h-11 px-5 text-base"
            >
              Explore the dashboard
            </LinkButton>
          </div>
        </div>
      </div>
    </section>
  )
}
