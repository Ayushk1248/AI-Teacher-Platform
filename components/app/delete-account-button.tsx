'use client'

import { useState } from 'react'
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export function DeleteAccountButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setIsDeleting(true)
    setError(null)

    try {
      const res = await fetch('/api/auth/delete-account', { method: 'POST' })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error ?? 'Deletion failed')
      }

      // Account deleted — redirect to the public landing page.
      // Use window.location to force a full navigation and clear all client state.
      window.location.href = '/'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsDeleting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/20"
      >
        <Trash2 className="size-4" />
        Delete account
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-destructive/30 bg-[#111827]/95 p-0 shadow-2xl">
            <div className="p-6">
              {/* Warning icon */}
              <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/15">
                <AlertTriangle className="size-6 text-destructive" />
              </div>

              <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Danger zone
              </p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">
                Delete your account?
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                This action is <strong className="text-foreground">permanent and cannot be undone</strong>.
                All of your data will be immediately deleted, including:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-destructive" />
                  Your profile and learning preferences
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-destructive" />
                  All courses, lessons, and progress
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-destructive" />
                  Assessment results and learning reports
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-destructive" />
                  All uploaded materials and files
                </li>
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                If you sign up again later, you will start with a completely fresh account.
              </p>

              {/* Error message */}
              {error && (
                <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsOpen(false)
                    setError(null)
                  }}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="gap-1.5"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      Deleting…
                    </>
                  ) : (
                    <>
                      <Trash2 className="size-3.5" />
                      Yes, delete my account
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
