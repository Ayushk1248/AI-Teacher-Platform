/**
 * Text chunker — splits extracted document text into overlapping chunks
 * suitable for embedding and vector retrieval.
 *
 * Strategy:
 *   - Prefer splitting at paragraph or sentence boundaries.
 *   - Target ~400 words per chunk (≈ 500 tokens for most English text).
 *   - Overlap of ~50 words between consecutive chunks to preserve context
 *     at boundaries.
 *
 * This is intentionally word-based (not token-based) to avoid a tokenizer
 * dependency. The approximation is good enough for RAG retrieval.
 */

import type { DocumentChunk } from '../types'

const TARGET_WORDS = 400
const OVERLAP_WORDS = 50

/**
 * Split `text` into overlapping chunks.
 *
 * @param text       Plain text extracted from a document
 * @param materialId Supabase material row ID (stored alongside each chunk)
 * @returns          Array of DocumentChunk objects ready for embedding
 */
export function chunkDocument(
  text: string,
  materialId: string,
): DocumentChunk[] {
  if (!text.trim()) return []

  // Split into paragraphs first, then words
  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean)

  // Flatten into a word array while tracking paragraph boundaries
  const words: string[] = []
  for (const para of paragraphs) {
    words.push(...para.split(/\s+/).filter(Boolean))
    words.push('\n\n') // paragraph boundary sentinel
  }

  const chunks: DocumentChunk[] = []
  let chunkIndex = 0
  let start = 0

  while (start < words.length) {
    const end = Math.min(start + TARGET_WORDS, words.length)
    const chunkWords = words.slice(start, end)

    // Skip sentinel-only chunks
    const content = chunkWords
      .join(' ')
      .replace(/ \n\n /g, '\n\n')
      .trim()

    if (content) {
      chunks.push({
        materialId,
        chunkIndex,
        content,
        tokenCount: estimateTokens(content),
      })
      chunkIndex++
    }

    // Advance by (TARGET - OVERLAP) to create overlap between chunks
    const advance = TARGET_WORDS - OVERLAP_WORDS
    start += advance

    // If the remaining text is smaller than OVERLAP, we're done
    if (start >= words.length) break
  }

  return chunks
}

/**
 * Rough token estimate: ~0.75 tokens per word for English text.
 * Good enough for logging and DB storage; not used for LLM context limits.
 */
function estimateTokens(text: string): number {
  return Math.ceil(text.split(/\s+/).length * 0.75)
}
