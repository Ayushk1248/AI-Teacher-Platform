'use client'

import { useState } from 'react'
import { Bot, ChevronDown, Send, Sparkles, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { askTeacherThread, type ChatMessage } from '@/lib/mock-data'

const suggestions = [
  'Explain this with a simpler analogy',
  'Give me a real-world example',
  'Why does this matter?',
]

export function AskTeacherPanel() {
  const [open, setOpen] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>(askTeacherThread)
  const [draft, setDraft] = useState('')

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed) return
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: trimmed },
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content:
          'Great question. Once the AI backend is connected, I will answer this in the context of your current lesson.',
      },
    ])
    setDraft('')
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229) {
      e.preventDefault()
      send(draft)
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/70 backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Sparkles className="size-4" />
          </span>
          <span className="text-sm font-medium text-foreground">Ask your AI Teacher</span>
        </span>
        <ChevronDown
          className={cn('size-4 text-muted-foreground transition-transform', open && 'rotate-180')}
        />
      </button>

      {open ? (
        <div className="border-t border-border">
          <div className="flex max-h-72 flex-col gap-4 overflow-y-auto px-4 py-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn('flex gap-2.5', m.role === 'user' && 'flex-row-reverse')}
              >
                <span
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg',
                    m.role === 'assistant'
                      ? 'bg-primary/15 text-primary'
                      : 'bg-secondary text-secondary-foreground',
                  )}
                >
                  {m.role === 'assistant' ? (
                    <Bot className="size-3.5" />
                  ) : (
                    <User className="size-3.5" />
                  )}
                </span>
                <div
                  className={cn(
                    'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    m.role === 'assistant'
                      ? 'rounded-tl-sm bg-secondary/70 text-foreground'
                      : 'rounded-tr-sm bg-primary text-primary-foreground',
                  )}
                >
                  {m.content}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => send(s)}
                className="rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about this concept..."
              className="h-10 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/50"
            />
            <Button
              size="icon"
              onClick={() => send(draft)}
              className="size-10 shrink-0 bg-gradient-to-r from-primary to-accent text-primary-foreground"
              aria-label="Send message"
            >
              <Send className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
