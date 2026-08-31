'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export type Option = {
  value: string
  label: string
  description?: string
  icon?: React.ReactNode
}

export function OptionGroup({
  options,
  value,
  onChange,
  columns = 2,
}: {
  options: Option[]
  value: string
  onChange: (value: string) => void
  columns?: 1 | 2 | 3
}) {
  const grid =
    columns === 3
      ? 'sm:grid-cols-3'
      : columns === 1
        ? 'grid-cols-1'
        : 'sm:grid-cols-2'

  return (
    <div className={cn('grid gap-3', grid)}>
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={cn(
              'group relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all',
              active
                ? 'border-primary/60 bg-primary/10 shadow-[0_0_0_1px_oklch(0.62_0.19_258_/_0.3)]'
                : 'border-border bg-card/50 hover:border-primary/40 hover:bg-card',
            )}
          >
            {option.icon && (
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-lg border transition-colors',
                  active
                    ? 'border-primary/30 bg-primary/15 text-primary'
                    : 'border-border bg-muted/50 text-muted-foreground group-hover:text-foreground',
                )}
              >
                {option.icon}
              </span>
            )}
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{option.label}</span>
                {active && <Check className="size-4 shrink-0 text-primary" />}
              </span>
              {option.description && (
                <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                  {option.description}
                </span>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-base font-semibold">{label}</h2>
        {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      </div>
      {children}
    </section>
  )
}
