/**
 * Retriever — cosine similarity search over stored embeddings in Supabase.
 *
 * Calls the `match_material_chunks` SQL function (defined in
 * supabase/migrations/20260902_rag_embeddings.sql) which uses pgvector's
 * `<=>` cosine distance operator.
 *
 * Returns the top-k most relevant chunks for a given query,
 * filtered to the specified user and (optionally) specific material IDs.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIProvider } from '../providers/types'
import type { RetrievedChunk } from '../types'

export interface RetrieveOptions {
  /** Maximum number of chunks to return. Default: 8 */
  topK?: number
  /** Minimum similarity score (0–1) to include. Default: 0.5 */
  minSimilarity?: number
  /** Limit retrieval to these material IDs. If empty, searches all user's materials. */
  materialIds?: string[]
}

/**
 * Retrieve the most relevant document chunks for a query string.
 *
 * @param query    The user's topic or question to find relevant context for
 * @param userId   Supabase user ID (enforces data isolation)
 * @param provider AI provider used to embed the query
 * @param supabase Supabase server client
 * @param options  Retrieval parameters
 */
export async function retrieveRelevantChunks(
  query: string,
  userId: string,
  provider: AIProvider,
  supabase: SupabaseClient,
  options: RetrieveOptions = {},
): Promise<RetrievedChunk[]> {
  const {
    topK = 8,
    minSimilarity = 0.5,
    materialIds,
  } = options

  // 1. Embed the query
  let queryEmbedding: number[]
  try {
    queryEmbedding = await provider.embed(query)
  } catch (err) {
    console.error('[retriever] Failed to embed query:', err)
    return []
  }

  // 2. Call the pgvector match function
  const { data, error } = await supabase.rpc('match_material_chunks', {
    query_embedding: `[${queryEmbedding.join(',')}]`,
    match_count: topK,
    filter_user_id: userId,
    filter_material_ids: materialIds?.length ? materialIds : null,
  })

  if (error) {
    console.error('[retriever] pgvector search failed:', error.message)
    return []
  }

  if (!data || !Array.isArray(data)) return []

  // 3. Filter by minimum similarity and return
  return (data as Array<{ id: string; material_id: string; content: string; similarity: number }>)
    .filter((row) => row.similarity >= minSimilarity)
    .map((row) => ({
      id: row.id,
      materialId: row.material_id,
      content: row.content,
      similarity: row.similarity,
    }))
}

/**
 * Format retrieved chunks into a single context block for injection
 * into a system prompt. Includes similarity scores for transparency.
 */
export function formatChunksAsContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return ''

  const lines = chunks.map(
    (chunk, i) =>
      `--- Excerpt ${i + 1} (relevance: ${(chunk.similarity * 100).toFixed(0)}%) ---\n${chunk.content}`,
  )

  return lines.join('\n\n')
}
