// SPDX-License-Identifier: MIT
import { embed, embedMany } from 'ai'

export const EMBEDDING_MODEL = 'openai/text-embedding-3-small'
export const EMBEDDING_DIMENSIONS = 1536

/**
 * Extract plain text from an uploaded file. PDFs are parsed with unpdf;
 * everything else is decoded as UTF-8 text.
 */
export async function extractText(
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<string> {
  const lower = filename.toLowerCase()

  const isPdf =
    mimeType === 'application/pdf' || lower.endsWith('.pdf')

  const isDocx =
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lower.endsWith('.docx')

  const isDoc =
    mimeType === 'application/msword' || lower.endsWith('.doc')

  if (isPdf) {
    const { extractText: extractPdf, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractPdf(pdf, { mergePages: true })
    return text.trim()
  }

  if (isDocx || isDoc) {
    const mammoth = await import('mammoth')
    const { value } = await mammoth.extractRawText({ buffer })
    return value.trim()
  }

  return buffer.toString('utf-8').trim()
}

/**
 * Scrape text content from a URL using cheerio.
 */
export async function scrapeUrl(url: string): Promise<string> {
  try {
    const fetch = await import('node-fetch').then((m) => m.default)
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      timeout: 10000,
    })

    if (!response.ok) throw new Error(`HTTP ${response.status}`)

    const html = await response.text()
    const { load } = await import('cheerio')
    const $ = load(html)

    // Remove script and style tags
    $('script, style, noscript').remove()

    // Extract main content — prefer article, main, or fallback to body
    const article =
      $('article').text() ||
      $('main').text() ||
      $('[role="main"]').text() ||
      $('body').text() ||
      ''

    return article
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 100000)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`Failed to scrape URL: ${msg}`)
  }
}

/**
 * Split text into overlapping chunks that respect paragraph/sentence
 * boundaries where possible. Sizes are in characters.
 */
export function chunkText(
  text: string,
  { size = 1200, overlap = 150 }: { size?: number; overlap?: number } = {},
): string[] {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  if (!clean) return []
  if (clean.length <= size) return [clean]

  const chunks: string[] = []
  let start = 0

  while (start < clean.length) {
    let end = Math.min(start + size, clean.length)

    if (end < clean.length) {
      // Prefer to break on a paragraph, then sentence, then space.
      const window = clean.slice(start, end)
      const para = window.lastIndexOf('\n\n')
      const sentence = window.lastIndexOf('. ')
      const space = window.lastIndexOf(' ')
      const breakAt = para > size * 0.5 ? para : sentence > size * 0.5 ? sentence + 1 : space
      if (breakAt > size * 0.3) end = start + breakAt
    }

    const piece = clean.slice(start, end).trim()
    if (piece) chunks.push(piece)
    if (end >= clean.length) break
    start = end - overlap
  }

  return chunks
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []
  const { embeddings } = await embedMany({
    model: EMBEDDING_MODEL,
    values: texts,
  })
  return embeddings
}

export async function embedQuery(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: EMBEDDING_MODEL,
    value: text,
  })
  return embedding
}

/** pgvector accepts a string literal like "[0.1,0.2,...]". */
export function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`
}
