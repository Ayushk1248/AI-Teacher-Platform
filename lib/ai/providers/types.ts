/**
 * Core AIProvider interface.
 *
 * Every LLM integration must implement this contract.
 * This allows swapping the underlying model (Gemini → OpenAI → Anthropic)
 * without touching any teacher, RAG, or application code.
 */

export interface GenerateOptions {
  /** 0–1. Lower = more deterministic. Default per-method. */
  temperature?: number
  /** Hard cap on output tokens. */
  maxTokens?: number
}

export interface AIProvider {
  /** Human-readable provider name used in logs. */
  readonly name: string

  /**
   * Generate free-form text from a system + user prompt pair.
   */
  generateText(
    systemPrompt: string,
    userPrompt: string,
    options?: GenerateOptions,
  ): Promise<string>

  /**
   * Generate a JSON-mode response guaranteed to be valid JSON.
   * The system prompt must describe the expected JSON schema.
   * The caller is responsible for type-casting / validating the result.
   */
  generateJSON<T>(
    systemPrompt: string,
    userPrompt: string,
    options?: GenerateOptions,
  ): Promise<T>

  /**
   * Embed a single text string into a dense vector.
   * Dimension depends on the provider (Gemini text-embedding-004 → 768).
   */
  embed(text: string): Promise<number[]>

  /**
   * Embed multiple texts. May use batching internally.
   */
  embedBatch(texts: string[]): Promise<number[][]>
}
