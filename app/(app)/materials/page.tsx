'use client'

import { useState, useEffect, useRef, useCallback, type DragEvent } from 'react'
import {
  FileText,
  UploadCloud,
  Sparkles,
  Clock,
  Trash2,
  ExternalLink,
  X,
  Loader2,
  File,
  FileSpreadsheet,
  Presentation,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/app/page-header'
import { formatRelativeDate } from '@/lib/format-date'
import { cn } from '@/lib/utils'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

type Material = {
  id: string
  name: string
  file_type: string | null
  file_size: number | null
  storage_path: string
  created_at: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FILE_ICONS: Record<string, typeof FileText> = {
  PDF: FileText,
  DOCX: File,
  PPTX: Presentation,
  TXT: FileText,
  Markdown: FileSpreadsheet,
}

function getFileIcon(type: string | null) {
  return FILE_ICONS[type ?? ''] ?? FileText
}

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPTED_TYPES = '.pdf,.docx,.pptx,.txt,.md'

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Fetch materials ──
  const fetchMaterials = useCallback(async () => {
    try {
      const res = await fetch('/api/materials')
      if (!res.ok) throw new Error('Failed to load materials')
      const data = await res.json()
      setMaterials(data.materials ?? [])
    } catch (err) {
      console.error(err)
      setError('Could not load your materials. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMaterials()
  }, [fetchMaterials])

  // ── Upload file ──
  async function uploadFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/materials', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload failed')
      setMaterials((prev) => [data.material, ...prev])
      setShowUpload(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  function handleFileSelect(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return
    uploadFile(fileList[0])
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  // ── Delete material ──
  async function deleteMaterial(id: string) {
    setDeletingId(id)
    setError(null)
    try {
      const res = await fetch('/api/materials', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Delete failed')
      }
      setMaterials((prev) => prev.filter((m) => m.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setDeletingId(null)
    }
  }

  // ── Open file (signed URL) ──
  async function openFile(storagePath: string) {
    const supabase = createSupabaseBrowserClient()
    if (!supabase) {
      setError('Could not connect to storage')
      return
    }
    const { data, error: urlError } = await supabase.storage
      .from('materials')
      .createSignedUrl(storagePath, 60 * 60) // 1-hour signed URL

    if (urlError || !data?.signedUrl) {
      setError('Could not generate download link')
      return
    }
    window.open(data.signedUrl, '_blank', 'noopener')
  }

  // ── Loading skeleton ──
  if (loading) {
    return (
      <div className="flex flex-col gap-8">
        <PageHeader
          eyebrow="Your library"
          title="Materials"
          description="All the documents you've uploaded. Each one is stored securely in your personal library."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="flex flex-col gap-4 p-5">
                <div className="flex items-start justify-between">
                  <div className="size-10 rounded-xl bg-muted" />
                  <div className="h-5 w-12 rounded-full bg-muted" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 w-20 rounded bg-muted" />
                  <div className="h-4 w-40 rounded bg-muted" />
                </div>
                <div className="h-3 w-24 rounded bg-muted" />
                <div className="h-8 rounded-lg bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        className="hidden"
        onChange={(e) => {
          handleFileSelect(e.target.files)
          e.target.value = ''
        }}
      />

      <PageHeader
        eyebrow="Your library"
        title="Materials"
        description="All the documents you've uploaded. Each one is stored securely in your personal library."
        actions={
          <Button
            onClick={() => {
              setShowUpload(true)
              inputRef.current?.click()
            }}
            size="lg"
            className="h-10 gap-2 bg-gradient-to-r from-primary to-accent px-4 text-primary-foreground"
          >
            <UploadCloud className="size-4" />
            Add Material
          </Button>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss error">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Upload area */}
      {showUpload && (
        <Card className="border-primary/30 transition-all">
          <CardContent className="flex flex-col gap-4 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                  <UploadCloud className="size-5" />
                </span>
                <div>
                  <h2 className="font-semibold">Upload material</h2>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, PPTX, TXT, or Markdown up to 25 MB</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpload(false)}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Close upload area"
              >
                <X className="size-5" />
              </button>
            </div>

            <div
              role="button"
              tabIndex={0}
              onClick={() => !uploading && inputRef.current?.click()}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && !uploading) inputRef.current?.click()
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={cn(
                'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition-colors',
                uploading && 'pointer-events-none opacity-60',
                dragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-muted/30 hover:border-primary/50 hover:bg-muted/50',
              )}
            >
              {uploading ? (
                <>
                  <Loader2 className="size-8 animate-spin text-primary" />
                  <p className="text-sm font-medium">Uploading…</p>
                </>
              ) : (
                <>
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <UploadCloud className="size-6" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">Drag & drop your file, or click to browse</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Your document stays private and is stored securely
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="secondary">PDF</Badge>
                    <Badge variant="secondary">DOCX</Badge>
                    <Badge variant="secondary">PPTX</Badge>
                    <Badge variant="secondary">TXT</Badge>
                    <Badge variant="secondary">MD</Badge>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Materials grid or empty state */}
      {materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-20 text-center">
          <span className="grid size-14 place-items-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <UploadCloud className="size-7" />
          </span>
          <div>
            <p className="font-medium">No materials yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Upload a document to get started.
            </p>
          </div>
          <Button
            onClick={() => {
              setShowUpload(true)
              inputRef.current?.click()
            }}
            size="lg"
            className="mt-2 gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground"
          >
            <Sparkles className="size-4" />
            Upload Your First File
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {materials.map((m) => {
            const Icon = getFileIcon(m.file_type)
            const isDeleting = deletingId === m.id
            return (
              <Card
                key={m.id}
                className={cn(
                  'transition-all hover:border-primary/40',
                  isDeleting && 'pointer-events-none opacity-50',
                )}
              >
                <CardContent className="flex flex-col gap-4 p-5">
                  {/* Top: icon + badge */}
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <Badge variant="outline">{m.file_type ?? 'File'}</Badge>
                  </div>

                  {/* Name */}
                  <div className="min-w-0">
                    <h3 className="truncate font-medium leading-snug" title={m.name}>
                      {m.name}
                    </h3>
                    {m.file_size != null && (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatFileSize(m.file_size)}
                      </p>
                    )}
                  </div>

                  {/* Date */}
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="mr-1 size-3.5" />
                    {formatRelativeDate(m.created_at)}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-8 flex-1 justify-center gap-1.5 text-xs"
                      onClick={() => openFile(m.storage_path)}
                    >
                      <ExternalLink className="size-3.5" />
                      Open
                    </Button>
                    <Button
                      variant="destructive"
                      size="lg"
                      className="h-8 gap-1.5 px-3 text-xs"
                      onClick={() => deleteMaterial(m.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
