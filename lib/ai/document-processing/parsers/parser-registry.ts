/**
 * Parser Registry — maps file extensions to their parser implementations.
 *
 * To add a new format:
 *   1. Create a parser class in this directory (implements DocumentParser)
 *   2. Import it here and add it to PARSERS[]
 *   3. Add its extension to SupportedFormat in types.ts
 *   No other changes needed.
 */

import type { DocumentParser } from './base-parser'
import type { SupportedFormat } from '../types'
import { PdfParser } from './pdf-parser'
import { DocxParser } from './docx-parser'
import { PptxParser } from './pptx-parser'
import { TxtParser } from './txt-parser'

// ── Registered parsers ────────────────────────────────────────────────────────

const PARSERS: DocumentParser[] = [
  new PdfParser(),
  new DocxParser(),
  new PptxParser(),
  new TxtParser(),
]

// ── Extension → format map ────────────────────────────────────────────────────

const EXT_TO_FORMAT: Record<string, SupportedFormat> = {
  '.pdf':  'pdf',
  '.docx': 'docx',
  '.pptx': 'pptx',
  '.txt':  'txt',
  '.md':   'md',
}

// ── Index by extension ────────────────────────────────────────────────────────

const parsersByExtension = new Map<string, DocumentParser>()
for (const parser of PARSERS) {
  for (const ext of parser.supportedExtensions) {
    parsersByExtension.set(ext.toLowerCase(), parser)
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns the parser for a given filename, or null if unsupported.
 */
export function getParser(filename: string): DocumentParser | null {
  const ext = getExtension(filename)
  return parsersByExtension.get(ext) ?? null
}

/**
 * Returns the SupportedFormat for a filename, or null if unsupported.
 */
export function getFormat(filename: string): SupportedFormat | null {
  const ext = getExtension(filename)
  return EXT_TO_FORMAT[ext] ?? null
}

/**
 * Returns true if this filename can be processed.
 */
export function isSupportedFile(filename: string): boolean {
  return parsersByExtension.has(getExtension(filename))
}

/**
 * All supported file extensions (for UI display).
 */
export const SUPPORTED_EXTENSIONS = [...parsersByExtension.keys()]

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot).toLowerCase() : ''
}
