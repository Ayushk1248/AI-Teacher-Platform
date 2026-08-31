import Image from 'next/image'
import { ArrowRight, Play, Sparkles } from 'lucide-react'
import { LinkButton } from '@/components/ui/link-button'
import { Badge } from '@/components/ui/badge'

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
      <div className="mx-auto grid w-full max-w-7xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-28">
        <div className="relative">
          <Badge variant="outline" className="mb-6 gap-2 border-primary/30 bg-primary/10 text-primary">
            <Sparkles />
            Meet your personal AI teacher
          </Badge>
          <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            Learn anything with a teacher <span className="text-gradient">built just for you</span>
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Lumina turns any document or topic into a guided course. Personalize how you learn,
            sit in a live AI classroom, and get clear reports on exactly what to master next.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <LinkButton
              href="/login"
              size="lg"
              className="h-11 bg-gradient-to-r from-primary to-accent px-5 text-base text-primary-foreground"
            >
              Start learning free
              <ArrowRight />
            </LinkButton>
            <LinkButton
              href="/login"
              variant="outline"
              size="lg"
              className="h-11 px-5 text-base"
            >
              <Play />
              See the classroom
            </LinkButton>
          </div>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">50k+</span> learners
            </div>
            <div className="h-4 w-px bg-border" />
            <div>
              <span className="font-semibold text-foreground">4.9/5</span> avg. rating
            </div>
            <div className="h-4 w-px bg-border" />
            <div>
              <span className="font-semibold text-foreground">1.2M</span> lessons taught
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-tr from-primary/25 via-accent/15 to-transparent blur-2xl" />
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card/60 glow-border">
            <Image
              src="/ai-teacher-hero.png"
              alt="Holographic AI teacher explaining floating educational diagrams"
              width={720}
              height={720}
              priority
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl border border-border/70 bg-background/70 p-3 backdrop-blur-md">
              <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-primary/20 text-primary">
                <span className="absolute inset-0 rounded-xl bg-primary/30 animate-pulse-ring" />
                <Sparkles className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">Now teaching: Neural Networks</p>
                <p className="truncate text-xs text-muted-foreground">
                  Adaptive session • personalized to your level
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
