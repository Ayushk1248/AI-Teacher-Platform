import { howItWorks } from '@/lib/mock-data'

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative border-y border-border/60 bg-card/30"
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium text-accent">How it works</p>
          <h2 className="mt-3 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            From a blank page to real understanding
          </h2>
        </div>

        <ol className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {howItWorks.map((item, index) => (
            <li key={item.step} className="relative">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 font-mono text-sm font-semibold text-primary">
                  {item.step}
                </span>
                {index < howItWorks.length - 1 && (
                  <span className="hidden h-px flex-1 bg-gradient-to-r from-primary/40 to-transparent lg:block" />
                )}
              </div>
              <h3 className="mt-4 text-base font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
