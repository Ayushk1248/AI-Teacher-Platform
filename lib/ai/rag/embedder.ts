/**
 * Embedder — generates vector embeddings for stored document chunks.
 *
 * Flow:
 *   1. Fetch chunks for a specific material that don't have embeddings yet.
 *   2. Call AIProvider.embedBatch() to get 768-dim vectors.
 *   3. Update the `material_chunks` table with the new embeddings.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AIProvider } from '../providers/types'

/**
 * Generate and store embeddings for a document's chunks.
 * This is called after the document processor has extracted and stored the plain text chunks.
 *
 * @param materialId Supabase material ID
 * @param userId     Supabase auth user ID (for security verification)
 * @param provider   AI provider used for embedding
 * @param supabase   Supabase admin/server client
 * @returns          Number of chunks successfully embedded
 */
export async function indexDocument(
  materialId: string,
  userId: string,
  provider: AIProvider,
  supabase: SupabaseClient,
): Promise<number> {
  console.log(`[embedder] Indexing material ${materialId} for user ${userId}`)

  // 1. Fetch chunks that need embedding
  const { data: chunks, error: fetchError } = await supabase
    .from('material_chunks')
    .select('id, content')
    .eq('material_id', materialId)
    .eq('user_id', userId)
    .is('embedding', null)
    .order('chunk_index', { ascending: true })

  if (fetchError) {
    throw new Error(`Failed to fetch chunks for embedding: ${fetchError.message}`)
  }

  if (!chunks || chunks.length === 0) {
    console.log(`[embedder] No chunks need embedding for material ${materialId}`)
    return 0
  }

  // 2. Embed contents
  const contents = chunks.map((c) => c.content)
  let embeddings: number[][]

  try {
    embeddings = await provider.embedBatch(contents)
  } catch (err) {
    console.error('[embedder] Embedding failed:', err)
    throw new Error('Failed to generate embeddings. Check your AI provider configuration/API key.')
  }

  // 3. Update database rows in batches
  const BATCH_SIZE = 50
  let updated = 0

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batchChunks = chunks.slice(i, i + BATCH_SIZE)
    const batchEmbeddings = embeddings.slice(i, i + BATCH_SIZE)

    // Supabase JS doesn't support bulk UPDATE out of the box easily,
    // so we'll do concurrent individual updates or a small promise.all batch.
    const updatePromises = batchChunks.map((chunk, index) => {
      return supabase
        .from('material_chunks')
        .update({
          // Supabase pgvector expects the vector as a string: '[0.1, 0.2, ...]'
          embedding: `[${batchEmbeddings[index]!.join(',')}]`,
        })
        .eq('id', chunk.id)
    })

    const results = await Promise.all(updatePromises)
    
    for (const res of results) {
      if (res.error) {
        console.error(`[embedder] Failed to update chunk embedding:`, res.error.message)
      } else {
        updated++
      }
    }
  }

  console.log(`[embedder] Successfully embedded ${updated}/${chunks.length} chunks`)
  return updated
}

/**
 * Completely delete all chunks and the index for a given material.
 */
export async function deleteDocumentIndex(
  materialId: string,
  userId: string,
  supabase: SupabaseClient,
): Promise<void> {
  const { error } = await supabase
    .from('material_chunks')
    .delete()
    .eq('material_id', materialId)
    .eq('user_id', userId)

  if (error) {
    throw new Error(`Failed to delete document index: ${error.message}`)
  }
}
