/**
 * Document Processing — Core Types
 *
 * These types flow through the entire ingestion pipeline:
 * Parser → Cleaner → Chunker → Processor → Database
 */

// ─── Parsed output from a single parser ──────────────────────────────────────

/**
 * A semantically meaningful section extracted from a document.
 * For PDF: one page. For DOCX: content between headings. For PPTX: one slide.
 * For TXT: content between double blank lines.
 */
export interface ParsedSection {
  /** Heading text, slide title, or undefined for unheaded content. */
  title?: string
  /** 1-based page or slide number, if the format supports it. */
  pageNumber?: number
  /** Cleaned text content of this section. */
  content: string
  /** 0-based position in the document — preserved through chunking. */
  sectionIndex: number
}

/**
 * The complete structured output from any document parser.
 */
export interface ParsedDocument {
  /** Original filename, preserved for logging. */
  filename: string
  /** File format — drives which parser was used. */
  sourceType: SupportedFormat
  /** Ordered list of sections. May be a single section for plain text. */
  sections: ParsedSection[]
  /** Total page/slide count (if available from the format). */
  totalPages?: number
  /** Full concatenated plain text (useful for fallback or token counting). */
  fullText: string
}

export type SupportedFormat = 'pdf' | 'docx' | 'pptx' | 'txt' | 'md'

// ─── Chunk types ──────────────────────────────────────────────────────────────

/**
 * A single chunk ready to be written to `material_chunks`.
 * Carries structural metadata so retrieval results can be traced back
 * to their origin in the document.
 */
export interface StructuredChunk {
  /** Supabase materials.id this chunk belongs to. */
  materialId: string
  /** 0-based sequential position across ALL chunks for this material. */
  chunkIndex: number
  /** The actual text content to be embedded / retrieved. */
  content: string
  /** Estimated token count (word-based approximation). */
  tokenCount: number
  /** Section heading or slide title, if present. */
  sectionTitle?: string
  /** 1-based page or slide number, if available. */
  pageNumber?: number
  /** 0-based index of the source section in the document. */
  sectionIndex: number
}

// ─── Ingestion result ─────────────────────────────────────────────────────────

/**
 * Summary returned after processing a document end-to-end.
 */
export interface IngestionResult {
  materialId: string
  filename: string
  sourceType: SupportedFormat
  totalSections: number
  totalChunks: number
  storedChunks: number
  totalPages?: number
  errors: string[]
  status: 'success' | 'partial' | 'failed'
}

// ─── Processing status (mirrored from DB enum) ────────────────────────────────

export type ProcessingStatus = 'pending' | 'processing' | 'ready' | 'error'
