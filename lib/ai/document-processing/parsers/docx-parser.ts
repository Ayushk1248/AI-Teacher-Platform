/**
 * DOCX Parser — heading-aware extraction from Word documents.
 *
 * Uses mammoth's HTML conversion (with a style map that maps Word heading
 * styles to h1/h2/h3) to detect document structure. Each heading starts a
 * new ParsedSection.
 *
 * Headings detected:
 *   - Word built-in: "Heading 1", "Heading 2", "Heading 3"
 *   - Common custom: "Title", "Subtitle"
 */

import type { DocumentParser } from './base-parser'
import type { ParsedDocument, ParsedSection, SupportedFormat } from '../types'
import { cleanRawText, stripHtml, estimateTokens } from '../cleaner'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as {
  convertToHtml: (
    input: { buffer: Buffer },
    options?: { styleMap?: string[] },
  ) => Promise<{ value: string; messages: unknown[] }>
}

// Style map: tell mammoth which Word paragraph styles to map to which HTML tags
const STYLE_MAP = [
  "p[style-name='Title'] => h1:fresh",
  "p[style-name='Subtitle'] => h2:fresh",
  "p[style-name='Heading 1'] => h1:fresh",
  "p[style-name='Heading 2'] => h2:fresh",
  "p[style-name='Heading 3'] => h3:fresh",
  "p[style-name='Heading 4'] => h3:fresh",
  "p[style-name='Heading 5'] => h3:fresh",
]

export class DocxParser implements DocumentParser {
  readonly supportedExtensions = ['.docx']
  readonly formatName = 'DOCX'

  async parse(
    buffer: Buffer,
    filename: string,
    format: SupportedFormat,
  ): Promise<ParsedDocument> {
    let html: string
    try {
      const result = await mammoth.convertToHtml(
        { buffer },
        { styleMap: STYLE_MAP },
      )
      html = result.value
    } catch (err) {
      throw new Error(`DOCX parsing failed for "${filename}": ${String(err)}`)
    }

    // ── Split HTML by headings ─────────────────────────────────────────────
    // We split on <h1>, <h2>, <h3> open tags, treating each as a section start.
    const sections = this.splitByHeadings(html)

    const fullText = sections.map((s) => s.content).join('\n\n')

    return {
      filename,
      sourceType: format,
      sections,
      fullText,
    }
  }

  private splitByHeadings(html: string): ParsedSection[] {
    // Match heading tags and capture level + text content
    const headingPattern = /<(h[1-3])[^>]*>([\s\S]*?)<\/\1>/gi
    const sections: ParsedSection[] = []

    let lastIndex = 0
    let sectionIndex = 0
    let currentTitle: string | undefined = undefined
    const matches: Array<{ index: number; title: string; endIndex: number }> = []

    let match: RegExpExecArray | null
    while ((match = headingPattern.exec(html)) !== null) {
      matches.push({
        index: match.index,
        title: stripHtml(match[2] ?? '').trim(),
        endIndex: match.index + match[0].length,
      })
    }

    for (let i = 0; i < matches.length; i++) {
      const current = matches[i]!
      const next = matches[i + 1]

      // Content before this heading (intro text with no heading)
      if (i === 0 && current.index > 0) {
        const introHtml = html.slice(0, current.index)
        const introText = cleanRawText(stripHtml(introHtml))
        if (introText && introText.split(/\s+/).length >= 10) {
          sections.push({
            content: introText,
            sectionIndex: sectionIndex++,
          })
        }
      }

      // This section runs from this heading to the next heading (or end)
      const bodyEnd = next ? next.index : html.length
      const bodyHtml = html.slice(current.endIndex, bodyEnd)
      const bodyText = cleanRawText(stripHtml(bodyHtml))

      // Include heading text in the section content for context
      const content = [current.title, bodyText].filter(Boolean).join('\n\n')

      if (content.split(/\s+/).length >= 3) {
        sections.push({
          title: current.title || undefined,
          content,
          sectionIndex: sectionIndex++,
        })
      }

      lastIndex = bodyEnd
    }

    // Trailing content after last heading
    if (lastIndex < html.length && matches.length > 0) {
      const trailingHtml = html.slice(lastIndex)
      const trailingText = cleanRawText(stripHtml(trailingHtml))
      if (trailingText && trailingText.split(/\s+/).length >= 10) {
        sections.push({
          content: trailingText,
          sectionIndex: sectionIndex++,
        })
      }
    }

    // If no headings found, treat the whole document as one section
    if (sections.length === 0) {
      const fullText = cleanRawText(stripHtml(html))
      if (fullText) {
        sections.push({ content: fullText, sectionIndex: 0 })
      }
    }

    return sections
  }
}
