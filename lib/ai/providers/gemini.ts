import {
  GoogleGenerativeAI,
  type GenerationConfig,
  type Content,
} from '@google/generative-ai'
import type { AIProvider, GenerateOptions } from './types'

/**
 * Gemini implementation of AIProvider.
 *
 * Models used:
 *   - gemini-2.0-flash   → text generation (fast, cheap, 1M context)
 *   - text-embedding-004  → embeddings (768-dim, free tier)
 *
 * Swap the model constants below to upgrade without touching any other code.
 */

const GENERATION_MODEL = process.env.GEMINI_MODEL ?? 'gemini-3.6-flash'
const EMBEDDING_MODEL = 'text-embedding-004'

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini'

  private readonly client: GoogleGenerativeAI

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey)
  }

  // ─── Text generation ──────────────────────────────────────────────────────

  async generateText(
    systemPrompt: string,
    userPrompt: string,
    options?: GenerateOptions,
  ): Promise<string> {
    const model = this.client.getGenerativeModel({ model: GENERATION_MODEL })

    const generationConfig: GenerationConfig = {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens,
    }

    const contents: Content[] = [
      { role: 'user', parts: [{ text: userPrompt }] },
    ]

    const result = await model.generateContent({
      systemInstruction: systemPrompt,
      contents,
      generationConfig,
    })

    return result.response.text()
  }

  // ─── JSON generation ──────────────────────────────────────────────────────

  async generateJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: GenerateOptions,
  ): Promise<T> {
    const model = this.client.getGenerativeModel({ model: GENERATION_MODEL })

    const generationConfig: GenerationConfig = {
      temperature: options?.temperature ?? 0.2, // lower temp = more reliable JSON
      maxOutputTokens: options?.maxTokens,
      responseMimeType: 'application/json',
    }

    const contents: Content[] = [
      { role: 'user', parts: [{ text: userPrompt }] },
    ]

    const result = await model.generateContent({
      systemInstruction: systemPrompt,
      contents,
      generationConfig,
    })

    const raw = result.response.text().trim()

    // Strip markdown code fences if the model wraps JSON in them
    const cleaned = raw.startsWith('```')
      ? raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      : raw

    return JSON.parse(cleaned) as T
  }

  // ─── Embeddings ───────────────────────────────────────────────────────────

  async embed(text: string): Promise<number[]> {
    const model = this.client.getGenerativeModel({ model: EMBEDDING_MODEL })
    const result = await model.embedContent(text)
    return result.embedding.values
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    // Gemini embedding API does not support true batching in this SDK version.
    // Process sequentially with a small gap to avoid rate-limit bursts.
    const results: number[][] = []
    for (const text of texts) {
      results.push(await this.embed(text))
      // Tiny yield to the event loop; adjust if hitting 429s
      await new Promise((r) => setTimeout(r, 50))
    }
    return results
  }
}
