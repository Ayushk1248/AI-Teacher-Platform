/**
 * TXT / Markdown Parser — section splitting for plain text files.
 *
 * Structure detection strategy:
 *   - Markdown headings (# / ## / ###) → section title
 *   - Double blank lines (paragraph gaps) → section separator
 *   - ALL CAPS short lines → treated as implicit headings
 *
 * Falls back to a single section if no structure is detectable.
 */

import type { DocumentParser } from './base-parser'
import type { ParsedDocument, ParsedSection, SupportedFormat } from '../types'
import { cleanRawText, estimateTokens } from '../cleaner'

/** Minimum word count to include a section (avoids tiny fragments). */
const MIN_SECTION_WORDS = 5

export class TxtParser implements DocumentParser {
  readonly supportedExtensions = ['.txt', '.md']
  readonly formatName = 'Plain Text / Markdown'

  async parse(
    buffer: Buffer,
    filename: string,
    format: SupportedFormat,
  ): Promise<ParsedDocument> {
    const raw = buffer.toString('utf-8')
    const cleaned = cleanRawText(raw)

    const isMarkdown = format === 'md' || filename.endsWith('.md')
    const sections = isMarkdown
      ? this.splitMarkdown(cleaned)
      : this.splitPlainText(cleaned)

    const fullText = sections.map((s) => s.content).join('\n\n')

    return {
      filename,
      sourceType: format,
      sections,
      fullText,
    }
  }

  // ─── Markdown splitting (by # headings) ───────────────────────────────────

  private splitMarkdown(text: string): ParsedSection[] {
    const lines = text.split('\n')
    const sections: ParsedSection[] = []
    let currentTitle: string | undefined = undefined
    let currentLines: string[] = []
    let sectionIndex = 0

    const flush = () => {
      const content = cleanRawText(currentLines.join('\n'))
      if (content && content.split(/\s+/).length >= MIN_SECTION_WORDS) {
        sections.push({ title: currentTitle, content, sectionIndex: sectionIndex++ })
      }
      currentLines = []
      currentTitle = undefined
    }

    for (const line of lines) {
      const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
      if (headingMatch) {
        // Flush current section, start new
        flush()
        currentTitle = headingMatch[2]!.trim()
        // Include heading in content for context
        currentLines.push(line)
      } else {
        currentLines.push(line)
      }
    }
    flush()

    // If no markdown headings found, fall back to plain-text splitting
    if (sections.length <= 1 && !sections[0]?.title) {
      return this.splitPlainText(text)
    }

    return sections
  }

  // ─── Plain text splitting (by double blank lines) ─────────────────────────

  private splitPlainText(text: string): ParsedSection[] {
    const paragraphBlocks = text.split(/\n\n+/)
    const sections: ParsedSection[] = []
    let sectionIndex = 0

    for (const block of paragraphBlocks) {
      const trimmed = block.trim()
      if (!trimmed || trimmed.split(/\s+/).length < MIN_SECTION_WORDS) continue

      // Detect implicit heading: first line is short and ALL CAPS or Title Case
      const firstLine = trimmed.split('\n')[0]!.trim()
      const isImplicitHeading =
        firstLine.length <= 80 &&
        (isAllCaps(firstLine) || isTitleCase(firstLine)) &&
        trimmed.split('\n').length > 1

      sections.push({
        title: isImplicitHeading ? firstLine : undefined,
        content: trimmed,
        sectionIndex: sectionIndex++,
      })
    }

    // Ultimate fallback: single section
    if (sections.length === 0 && text.trim()) {
      sections.push({ content: text.trim(), sectionIndex: 0 })
    }

    return sections
  }
}

// ─── Heading detection helpers ────────────────────────────────────────────────

function isAllCaps(line: string): boolean {
  const letters = line.replace(/[^a-z]/gi, '')
  return letters.length > 2 && letters === letters.toUpperCase()
}

function isTitleCase(line: string): boolean {
  const words = line.split(/\s+/).filter((w) => w.length > 3)
  if (words.length < 2) return false
  return words.every((w) => /^[A-Z]/.test(w))
}
