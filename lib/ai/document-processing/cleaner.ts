/**
 * Text cleaning utilities.
 *
 * Applied by every parser before sections are returned, and again
 * by the chunker before writing to the database.
 *
 * Cleaning goals:
 *   - Remove noise common in PDF/DOCX extractions (headers, footers, page numbers)
 *   - Normalise whitespace and line endings
 *   - Fix hyphenated line-breaks common in PDF text layers
 *   - Preserve intentional paragraph breaks
 *   - Keep content changes minimal — do not rewrite or summarise
 */

/**
 * Full clean pass: normalize, fix PDF artifacts, collapse whitespace.
 * Use this on raw extracted text before splitting into sections.
 */
export function cleanRawText(text: string): string {
  return text
    // Normalise line endings
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Fix hyphenated line-breaks (PDF reflow artifact):  "im-\nportant" → "important"
    .replace(/(\w)-\n(\w)/g, '$1$2')
    // Remove form-feed characters (PDF page breaks — we handle pages separately)
    .replace(/\f/g, '\n\n')
    // Collapse 3+ consecutive newlines to double newline (paragraph separator)
    .replace(/\n{3,}/g, '\n\n')
    // Normalise horizontal whitespace (tabs, multiple spaces → single space)
    .replace(/[ \t]+/g, ' ')
    // Remove lines that are ONLY whitespace
    .replace(/^\s+$/gm, '')
    .trim()
}

/**
 * Lightweight clean pass for a single chunk's content.
 * Assumes `cleanRawText` was already applied upstream.
 */
export function cleanChunkContent(content: string): string {
  return content
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

/**
 * Remove common PDF noise patterns:
 *   - Standalone page numbers (e.g. "- 12 -", "Page 12 of 30")
 *   - All-caps headers/footers that repeat on every page
 *   - Email addresses or URLs that landed in headers
 */
export function removePdfNoise(text: string): string {
  return text
    // Page number patterns: "- 12 -", "12", "Page 12", "Page 12 of 30"
    .replace(/^[-–]\s*\d+\s*[-–]$/gm, '')
    .replace(/^Page\s+\d+(\s+of\s+\d+)?$/gim, '')
    .replace(/^\d+\s*$/gm, '')
    // Common footer/header patterns
    .replace(/^Confidential[\s\S]{0,80}$/gim, '')
    .replace(/^All rights reserved[\s\S]{0,80}$/gim, '')
    // Collapse leftover blank lines
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Strip HTML tags from a string.
 * Used after mammoth's HTML output to get plain text for a section.
 */
export function stripHtml(html: string): string {
  return html
    // Replace block-level tags with newlines to preserve structure
    .replace(/<\/(p|div|li|h[1-6]|tr|br)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Strip all remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * Estimate token count for a string.
 * ~0.75 tokens per word is a reasonable English approximation.
 * Used for logging and chunk sizing — not for LLM context management.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.trim().split(/\s+/).length * 0.75)
}
