/**
 * AI Provider factory.
 *
 * Usage:
 *   import { getAIProvider } from '@/lib/ai/providers'
 *   const ai = getAIProvider()
 *   const text = await ai.generateText(system, user)
 *
 * To add a new provider:
 *   1. Implement AIProvider in a new file (e.g. openai.ts)
 *   2. Add its name to the ProviderName union
 *   3. Add a case in the switch below
 *   4. Set AI_PROVIDER=openai in .env.local
 */

import { GeminiProvider } from './gemini'
import type { AIProvider } from './types'

export type { AIProvider, GenerateOptions } from './types'

type ProviderName = 'gemini' // extend: | 'openai' | 'anthropic'

// Module-level singleton — created once per server process lifetime.
let _provider: AIProvider | null = null

/**
 * Returns the configured AI provider singleton.
 * Reads AI_PROVIDER from env (default: 'gemini').
 * Throws clearly if the required API key is missing.
 */
export function getAIProvider(): AIProvider {
  if (_provider) return _provider

  const name = (process.env.AI_PROVIDER ?? 'gemini') as ProviderName

  switch (name) {
    case 'gemini': {
      const apiKey = process.env.GOOGLE_AI_API_KEY?.trim()
      if (!apiKey) {
        throw new Error(
          '[AI] GOOGLE_AI_API_KEY is not set. Add it to .env.local to enable AI features.',
        )
      }
      _provider = new GeminiProvider(apiKey)
      break
    }

    default: {
      throw new Error(
        `[AI] Unknown provider "${name}". Valid options: gemini. Set AI_PROVIDER in .env.local.`,
      )
    }
  }

  console.log(`[AI] Provider initialized: ${_provider.name}`)
  return _provider
}
