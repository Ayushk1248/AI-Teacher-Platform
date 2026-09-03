/**
 * Document Processing Orchestrator
 *
 * Coordinates the full document ingestion pipeline:
 *   1. Download file from Supabase Storage
 *   2. Identify and instantiate the correct parser
 *   3. Parse into structured sections
 *   4. Chunk sections into overlapping structured chunks
 *   5. Persist chunks and metadata to the database
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getParser, getFormat } from './parsers/parser-registry'
import { chunkSections } from './chunker'
import type { IngestionResult, StructuredChunk } from './types'

export async function processDocument(
  materialId: string,
  userId: string,
  supabase: SupabaseClient,
): Promise<IngestionResult> {
  const errors: string[] = []

  try {
    // 1. Mark as processing
    await updateStatus(materialId, 'processing', supabase)

    // 2. Fetch material metadata
    const { data: material, error: fetchError } = await supabase
      .from('materials')
      .select('name, storage_path')
      .eq('id', materialId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !material) {
      throw new Error(`Material not found or access denied: ${fetchError?.message || ''}`)
    }

    const { name: filename, storage_path: storagePath } = material

    // 3. Resolve parser
    const format = getFormat(filename)
    const parser = getParser(filename)

    if (!format || !parser) {
      throw new Error(`Unsupported file format for "${filename}"`)
    }

    console.log(`[processor] Processing "${filename}" using ${parser.formatName} parser...`)

    // 4. Download file from Storage
    const { data: fileBlob, error: downloadError } = await supabase.storage
      .from('materials')
      .download(storagePath)

    if (downloadError || !fileBlob) {
      throw new Error(`Failed to download file from storage: ${downloadError?.message || ''}`)
    }

    const buffer = Buffer.from(await fileBlob.arrayBuffer())

    // 5. Parse document
    const parsedDoc = await parser.parse(buffer, filename, format)
    console.log(`[processor] Parsed ${parsedDoc.sections.length} sections from "${filename}"`)

    // 6. Chunk sections
    const chunks = chunkSections(parsedDoc.sections, materialId)
    console.log(`[processor] Generated ${chunks.length} chunks`)

    // 7. Clear old chunks (idempotency)
    const { error: deleteError } = await supabase
      .from('material_chunks')
      .delete()
      .eq('material_id', materialId)

    if (deleteError) {
      console.warn('[processor] Could not clear old chunks:', deleteError.message)
      errors.push(`Warning: could not clear old chunks: ${deleteError.message}`)
    }

    // 8. Persist chunks in batches
    let storedChunks = 0
    if (chunks.length > 0) {
      const rows = chunks.map((chunk) => ({
        material_id: chunk.materialId,
        user_id: userId,
        chunk_index: chunk.chunkIndex,
        content: chunk.content,
        token_count: chunk.tokenCount,
        section_title: chunk.sectionTitle || null,
        page_number: chunk.pageNumber || null,
        section_index: chunk.sectionIndex,
        // Embedding is left null for now; will be backfilled or populated later
        embedding: null,
      }))

      const BATCH_SIZE = 50
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE)
        const { error: insertError } = await supabase
          .from('material_chunks')
          .insert(batch)

        if (insertError) {
          throw new Error(`Failed to insert chunks: ${insertError.message}`)
        }
        storedChunks += batch.length
      }
    }

    // 9. Mark as ready and update metadata
    const { error: updateError } = await supabase
      .from('materials')
      .update({
        processing_status: 'ready',
        total_pages: parsedDoc.totalPages || null,
        total_chunks: chunks.length,
        processing_errors: errors,
      })
      .eq('id', materialId)

    if (updateError) {
      console.warn('[processor] Failed to update final status:', updateError.message)
    }

    return {
      materialId,
      filename,
      sourceType: format,
      totalSections: parsedDoc.sections.length,
      totalChunks: chunks.length,
      storedChunks,
      totalPages: parsedDoc.totalPages,
      errors,
      status: 'success',
    }

  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    console.error(`[processor] Processing failed for material ${materialId}:`, errorMsg)
    
    errors.push(errorMsg)
    
    // Attempt to mark as error in DB
    await updateStatus(materialId, 'error', supabase, errors)

    return {
      materialId,
      filename: 'unknown',
      sourceType: 'txt', // fallback
      totalSections: 0,
      totalChunks: 0,
      storedChunks: 0,
      errors,
      status: 'failed',
    }
  }
}

async function updateStatus(
  materialId: string,
  status: 'pending' | 'processing' | 'ready' | 'error',
  supabase: SupabaseClient,
  errors: string[] = []
) {
  await supabase
    .from('materials')
    .update({ 
      processing_status: status,
      processing_errors: errors 
    })
    .eq('id', materialId)
}
