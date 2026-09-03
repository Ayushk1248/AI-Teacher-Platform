/**
 * PPTX Parser — per-slide extraction from PowerPoint presentations.
 *
 * PPTX files are ZIP archives containing DrawingML XML.
 * Each slide (`ppt/slides/slide{N}.xml`) becomes one ParsedSection.
 *
 * Structure preserved:
 *   - Slide number → pageNumber
 *   - Slide title (<p:ph type="title"> or <p:ph type="ctrTitle">) → section title
 *   - All text runs (<a:t>) → section content
 *
 * Notes: Speaker notes (ppt/notesSlides/) are included in content when present.
 */

import type { DocumentParser } from './base-parser'
import type { ParsedDocument, ParsedSection, SupportedFormat } from '../types'
import { cleanRawText, estimateTokens } from '../cleaner'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdmZip = require('adm-zip') as new (buffer: Buffer) => {
  getEntry: (name: string) => { getData: () => Buffer } | null
  getEntries: () => Array<{ entryName: string; getData: () => Buffer }>
}

export class PptxParser implements DocumentParser {
  readonly supportedExtensions = ['.pptx']
  readonly formatName = 'PPTX'

  async parse(
    buffer: Buffer,
    filename: string,
    format: SupportedFormat,
  ): Promise<ParsedDocument> {
    let zip: InstanceType<typeof AdmZip>
    try {
      zip = new AdmZip(buffer)
    } catch (err) {
      throw new Error(`PPTX parsing failed for "${filename}": ${String(err)}`)
    }

    const entries = zip.getEntries()

    // ── Find and sort slide entries ──────────────────────────────────────────
    const slideEntries = entries
      .filter((e: { entryName: string }) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
      .sort((a: { entryName: string }, b: { entryName: string }) => {
        const numA = parseInt(a.entryName.match(/\d+/)?.[0] ?? '0', 10)
        const numB = parseInt(b.entryName.match(/\d+/)?.[0] ?? '0', 10)
        return numA - numB
      })

    // ── Find note slide entries (optional speaker notes) ─────────────────────
    const noteEntries = new Map<number, string>()
    for (const entry of entries) {
      const match = entry.entryName.match(/^ppt\/notesSlides\/notesSlide(\d+)\.xml$/i)
      if (match) {
        const slideNum = parseInt(match[1]!, 10)
        noteEntries.set(slideNum, entry.getData().toString('utf-8'))
      }
    }

    // ── Parse each slide ─────────────────────────────────────────────────────
    const sections: ParsedSection[] = []

    for (let i = 0; i < slideEntries.length; i++) {
      const entry = slideEntries[i]!
      const slideNum = i + 1
      const xml = entry.getData().toString('utf-8')

      const { title, body } = this.parseSlideXml(xml)
      const notesText = noteEntries.has(slideNum)
        ? this.extractNotesText(noteEntries.get(slideNum)!)
        : ''

      // Compose section content: slide body + optional notes
      const parts = [body, notesText ? `Speaker notes: ${notesText}` : ''].filter(Boolean)
      const content = cleanRawText(parts.join('\n\n'))

      // Skip completely empty slides (e.g. blank transition slides)
      if (!content || content.split(/\s+/).length < 3) continue

      sections.push({
        title: title || `Slide ${slideNum}`,
        pageNumber: slideNum,
        content,
        sectionIndex: i,
      })
    }

    const fullText = sections.map((s) => s.content).join('\n\n')

    return {
      filename,
      sourceType: format,
      sections,
      totalPages: slideEntries.length,
      fullText,
    }
  }

  // ─── XML extraction helpers ────────────────────────────────────────────────

  /**
   * Extract title and body text from a slide's XML.
   *
   * Title placeholders have `<p:ph type="title">` or `<p:ph type="ctrTitle">`.
   * Body content comes from all other `<a:t>` text runs.
   */
  private parseSlideXml(xml: string): { title: string; body: string } {
    // Find all shape elements
    const shapePattern = /<p:sp>([\s\S]*?)<\/p:sp>/g
    const titleTexts: string[] = []
    const bodyTexts: string[] = []

    let shapeMatch: RegExpExecArray | null
    while ((shapeMatch = shapePattern.exec(xml)) !== null) {
      const shapeXml = shapeMatch[1]!
      const isTitle = /<p:ph\s+type="(?:title|ctrTitle)"/i.test(shapeXml)

      const texts = this.extractTextRuns(shapeXml)
      if (texts.length === 0) continue

      if (isTitle) {
        titleTexts.push(...texts)
      } else {
        bodyTexts.push(...texts)
      }
    }

    return {
      title: titleTexts.join(' ').trim(),
      body: bodyTexts.join('\n').trim(),
    }
  }

  /**
   * Extract text runs (`<a:t>`) from a shape or notes XML fragment.
   * Preserves paragraph breaks between `<a:p>` elements.
   */
  private extractTextRuns(xml: string): string[] {
    const paragraphPattern = /<a:p>([\s\S]*?)<\/a:p>/g
    const paragraphs: string[] = []

    let paraMatch: RegExpExecArray | null
    while ((paraMatch = paragraphPattern.exec(xml)) !== null) {
      const paraXml = paraMatch[1]!
      const runPattern = /<a:t[^>]*>([\s\S]*?)<\/a:t>/g
      const runs: string[] = []

      let runMatch: RegExpExecArray | null
      while ((runMatch = runPattern.exec(paraXml)) !== null) {
        const text = runMatch[1]!
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim()
        if (text) runs.push(text)
      }

      if (runs.length > 0) paragraphs.push(runs.join(' '))
    }

    return paragraphs
  }

  private extractNotesText(notesXml: string): string {
    const texts = this.extractTextRuns(notesXml)
    return texts.join('\n').trim()
  }
}
