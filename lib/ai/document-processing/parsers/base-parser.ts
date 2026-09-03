/**
 * DocumentParser interface — the extensibility contract for all format parsers.
 *
 * To add support for a new file format (e.g., .epub, .xlsx):
 *   1. Create a new file in this directory implementing DocumentParser
 *   2. Register it in parser-registry.ts
 *   3. No other code changes needed
 */

import type { ParsedDocument, SupportedFormat } from '../types'

export interface DocumentParser {
  /** File extensions this parser handles, e.g. ['.pdf']. Lowercase, dot-prefixed. */
  readonly supportedExtensions: string[]

  /** Human-readable format name used in logs. */
  readonly formatName: string

  /**
   * Parse a raw file buffer into a structured ParsedDocument.
   *
   * @param buffer    Raw bytes of the uploaded file
   * @param filename  Original filename (for logging and metadata)
   * @param format    Resolved format type
   * @returns         Fully parsed document with sections and metadata
   */
  parse(
    buffer: Buffer,
    filename: string,
    format: SupportedFormat,
  ): Promise<ParsedDocument>
}
