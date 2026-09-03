/**
 * Document parser — converts uploaded files into plain text.
 *
 * Supported formats:
 *   .pdf   — pdf-parse (text layer extraction)
 *   .docx  — mammoth (Word → plain text)
 *   .pptx  — adm-zip XML extraction (reads slide text nodes)
 *   .txt   — direct UTF-8 decode
 *   .md    — direct UTF-8 decode
 *
 * All parsing runs server-side only (Node.js API route context).
 */

// Note: pdf-parse requires importing from its lib path in Next.js to
// avoid the package's test-file fs.readFileSync at module load time.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse/lib/pdf-parse.js') as (
  buffer: Buffer,
) => Promise<{ text: string; numpages: number }>

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mammoth = require('mammoth') as {
  extractRawText: (input: { buffer: Buffer }) => Promise<{ value: string; messages: unknown[] }>
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const AdmZip = require('adm-zip') as new (buffer: Buffer) => {
  getEntries: () => Array<{ entryName: string; getData: () => Buffer }>
}

/**
 * Extract plain text from a document buffer.
 *
 * @param buffer   Raw file bytes
 * @param filename Original filename (used to detect format)
 * @returns        Extracted plain text, or empty string on failure
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const ext = getExtension(filename)

  try {
    switch (ext) {
      case '.pdf':
        return await parsePdf(buffer)
      case '.docx':
        return await parseDocx(buffer)
      case '.pptx':
        return parsePptx(buffer)
      case '.txt':
      case '.md':
        return buffer.toString('utf-8')
      default:
        console.warn(`[document-parser] Unsupported extension: ${ext}`)
        return ''
    }
  } catch (err) {
    console.error(`[document-parser] Failed to parse "${filename}":`, err)
    return ''
  }
}

// ─── Format-specific parsers ──────────────────────────────────────────────────

async function parsePdf(buffer: Buffer): Promise<string> {
  const result = await pdfParse(buffer)
  return cleanText(result.text)
}

async function parseDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer })
  return cleanText(result.value)
}

/**
 * PPTX files are ZIP archives containing slide XML files.
 * We extract text from `ppt/slides/slide*.xml` entries.
 */
function parsePptx(buffer: Buffer): string {
  const zip = new AdmZip(buffer)
  const entries = zip.getEntries()

  const slideEntries = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => {
      // Sort slide1.xml < slide2.xml < slide10.xml
      const numA = parseInt(a.entryName.match(/\d+/)?.[0] ?? '0', 10)
      const numB = parseInt(b.entryName.match(/\d+/)?.[0] ?? '0', 10)
      return numA - numB
    })

  const texts: string[] = []
  for (const entry of slideEntries) {
    const xml = entry.getData().toString('utf-8')
    // Extract text from <a:t> tags (DrawingML text runs)
    const matches = xml.match(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g) ?? []
    for (const match of matches) {
      const text = match.replace(/<[^>]+>/g, '').trim()
      if (text) texts.push(text)
    }
    texts.push('\n') // slide separator
  }

  return cleanText(texts.join(' '))
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf('.')
  return dot >= 0 ? filename.slice(dot).toLowerCase() : ''
}

/** Collapse runs of whitespace, normalize line breaks. */
function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
