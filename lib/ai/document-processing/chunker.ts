/**
 * Structure-aware chunker.
 *
 * Unlike the basic chunker in lib/ai/rag/chunker.ts, this one:
 *   - Respects section boundaries: never produces a chunk that spans two sections
 *   - Carries section metadata (title, pageNumber, sectionIndex) into each chunk
 *   - Splits large sections at paragraph boundaries within the section
 *   - Uses a target of ~400 words with 60-word overlap for continuity
 *
 * The output StructuredChunk[] is written directly to the material_chunks table
 * (without embeddings at this stage).
 */

import type { ParsedSection } from './types'
import type { StructuredChunk } from './types'
import { cleanChunkContent, estimateTokens } from './cleaner'

/** Target number of words per chunk. Tuned for retrieval quality. */
const TARGET_WORDS = 400
/** Overlap between consecutive chunks from the same section. */
const OVERLAP_WORDS = 60
/** Skip any chunk with fewer words than this (avoids near-empty chunks). */
const MIN_CHUNK_WORDS = 20

/**
 * Chunk an array of parsed sections into StructuredChunk objects.
 *
 * @param sections   Sections from a DocumentParser
 * @param materialId Supabase materials.id this material belongs to
 */
export function chunkSections(
  sections: ParsedSection[],
  materialId: string,
): StructuredChunk[] {
  const allChunks: StructuredChunk[] = []
  let globalChunkIndex = 0

  for (const section of sections) {
    const sectionChunks = chunkSection(
      section,
      materialId,
      globalChunkIndex,
    )
    globalChunkIndex += sectionChunks.length
    allChunks.push(...sectionChunks)
  }

  return allChunks
}

// ─── Section-level chunking ────────────────────────────────────────────────────

function chunkSection(
  section: ParsedSection,
  materialId: string,
  startIndex: number,
): StructuredChunk[] {
  const { title, pageNumber, content, sectionIndex } = section

  // Split section content into paragraphs first
  const paragraphs = content
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.split(/\s+/).length >= 3)

  if (paragraphs.length === 0) return []

  const chunks: StructuredChunk[] = []

  // Build word-level list from paragraphs, preserving paragraph breaks
  const words: string[] = []
  for (const para of paragraphs) {
    words.push(...para.split(/\s+/).filter(Boolean))
    words.push('\n\n') // paragraph boundary marker
  }

  let chunkOffset = 0
  let start = 0

  while (start < words.length) {
    const end = Math.min(start + TARGET_WORDS, words.length)
    const chunkWords = words.slice(start, end)

    const rawContent = chunkWords
      .join(' ')
      .replace(/ \n\n /g, '\n\n')

    const content = cleanChunkContent(rawContent)
    const wordCount = content.split(/\s+/).filter(Boolean).length

    if (wordCount >= MIN_CHUNK_WORDS) {
      chunks.push({
        materialId,
        chunkIndex: startIndex + chunkOffset,
        content,
        tokenCount: estimateTokens(content),
        sectionTitle: title,
        pageNumber,
        sectionIndex,
      })
      chunkOffset++
    }

    // Advance with overlap
    const advance = TARGET_WORDS - OVERLAP_WORDS
    start += advance
    if (start >= words.length) break
  }

  return chunks
}
