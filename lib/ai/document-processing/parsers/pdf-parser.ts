/**
 * PDF Parser — extracts text per-page, preserving page numbers as structure.
 *
 * Uses pdf-parse with a custom page renderer to capture per-page content.
 * Each page becomes a ParsedSection, enabling page-level chunk metadata.
 *
 * Page titles are derived from the first meaningful line of each page
 * (often the heading or section title printed at the top).
 */

import type { DocumentParser } from './base-parser'
import type { ParsedDocument, ParsedSection, SupportedFormat } from '../types'
import { cleanRawText, removePdfNoise, estimateTokens } from '../cleaner'

// Workaround: import from lib path to avoid pdf-parse's test-file fs.readFileSync
// at module load time, which breaks Next.js Turbopack.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  buffer: Buffer,
  options?: { pagerender?: (pageData: unknown) => Promise<string> },
) => Promise<{ text: string; numpages: number }>

export class PdfParser implements DocumentParser {
  readonly supportedExtensions = ['.pdf']
  readonly formatName = 'PDF'

  async parse(
    buffer: Buffer,
    filename: string,
    format: SupportedFormat,
  ): Promise<ParsedDocument> {
    const pageTexts: string[] = []

    // ── Per-page renderer ────────────────────────────────────────────────────
    // pdf-parse calls this for each page with the PDFPage proxy.
    // We capture per-page content by pushing to pageTexts[].
    const pagerender = async (pageData: unknown): Promise<string> => {
      const page = pageData as {
        getTextContent: () => Promise<{
          items: Array<{ str: string; hasEOL?: boolean }>
        }>
      }

      try {
        const content = await page.getTextContent()
        const lines: string[] = []
        let currentLine = ''

        for (const item of content.items) {
          currentLine += item.str
          if (item.hasEOL) {
            lines.push(currentLine.trim())
            currentLine = ''
          }
        }
        if (currentLine.trim()) lines.push(currentLine.trim())

        const pageText = lines.filter(Boolean).join('\n')
        pageTexts.push(pageText)
        return pageText
      } catch {
        // Fall back to empty page on per-page render failure
        pageTexts.push('')
        return ''
      }
    }

    let totalPages = 0
    try {
      const result = await pdfParse(buffer, { pagerender })
      totalPages = result.numpages
    } catch (err) {
      throw new Error(`PDF parsing failed for "${filename}": ${String(err)}`)
    }

    // ── Build sections (one per page) ────────────────────────────────────────
    const sections: ParsedSection[] = []

    for (let i = 0; i < pageTexts.length; i++) {
      const raw = pageTexts[i] ?? ''
      const cleaned = removePdfNoise(cleanRawText(raw))

      // Skip blank pages
      if (!cleaned || cleaned.split(/\s+/).length < 5) continue

      // Extract candidate heading: first non-empty line of the page
      const lines = cleaned.split('\n').map((l) => l.trim()).filter(Boolean)
      const candidateTitle = lines[0] ?? undefined

      // Treat the first line as a title only if it's reasonably short (heading-like)
      const title =
        candidateTitle && candidateTitle.length <= 120 && lines.length > 1
          ? candidateTitle
          : undefined

      // Content is everything (we keep the title line in the body too)
      const content = cleaned

      sections.push({
        title,
        pageNumber: i + 1,
        content,
        sectionIndex: sections.length,
      })
    }

    // If per-page render produced nothing, fall back to full-text extraction
    if (sections.length === 0) {
      const fallbackResult = await pdfParse(buffer)
      const cleaned = removePdfNoise(cleanRawText(fallbackResult.text))
      if (cleaned) {
        sections.push({
          content: cleaned,
          sectionIndex: 0,
        })
      }
      totalPages = fallbackResult.numpages
    }

    const fullText = sections.map((s) => s.content).join('\n\n')

    return {
      filename,
      sourceType: format,
      sections,
      totalPages,
      fullText,
    }
  }
}
