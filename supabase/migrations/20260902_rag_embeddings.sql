-- ─────────────────────────────────────────────────────────────────────────────
-- RAG Embeddings Schema
-- Migration: 20260902_rag_embeddings.sql
--
-- Creates:
--   1. pgvector extension (if not already enabled)
--   2. material_chunks table — stores document chunks + embeddings
--   3. ivfflat index for fast cosine similarity search
--   4. match_material_chunks() SQL function for pgvector retrieval
--   5. RLS policies scoped to user_id
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Enable pgvector extension
-- Run this once per Supabase project (requires pgvector extension in project settings)
CREATE EXTENSION IF NOT EXISTS vector;


-- 2. material_chunks table
CREATE TABLE IF NOT EXISTS public.material_chunks (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id  uuid        NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chunk_index  integer     NOT NULL,
  content      text        NOT NULL,
  token_count  integer,
  -- 768 dimensions = Gemini text-embedding-004
  -- Change this value if you switch embedding models
  embedding    vector(768),
  created_at   timestamptz DEFAULT now()
);

-- Composite key: each (material, chunk_index) pair is unique
CREATE UNIQUE INDEX IF NOT EXISTS material_chunks_material_chunk_idx
  ON public.material_chunks (material_id, chunk_index);

-- Fast ANN search index (ivfflat with cosine distance)
-- lists = 100 is a good default for up to ~1M vectors
CREATE INDEX IF NOT EXISTS material_chunks_embedding_idx
  ON public.material_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Filtering index for user + material lookups
CREATE INDEX IF NOT EXISTS material_chunks_user_material_idx
  ON public.material_chunks (user_id, material_id);


-- 3. Row Level Security
ALTER TABLE public.material_chunks ENABLE ROW LEVEL SECURITY;

-- Users can only SELECT their own chunks
DROP POLICY IF EXISTS "Users can view own chunks" ON public.material_chunks;
CREATE POLICY "Users can view own chunks"
  ON public.material_chunks
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used by embedder.ts) can manage all chunks
DROP POLICY IF EXISTS "Service role manages chunks" ON public.material_chunks;
CREATE POLICY "Service role manages chunks"
  ON public.material_chunks
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- 4. match_material_chunks() — called by lib/ai/rag/retriever.ts
--
-- Parameters:
--   query_embedding     — the embedded query vector (same dimension as stored embeddings)
--   match_count         — how many results to return
--   filter_user_id      — restrict to a specific user's chunks
--   filter_material_ids — restrict to specific material IDs (NULL = all user's materials)
--
-- Returns rows ordered by cosine SIMILARITY (1 - distance), highest first.

CREATE OR REPLACE FUNCTION match_material_chunks(
  query_embedding    vector(768),
  match_count        int,
  filter_user_id     uuid,
  filter_material_ids uuid[]
)
RETURNS TABLE (
  id           uuid,
  material_id  uuid,
  content      text,
  similarity   float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    mc.id,
    mc.material_id,
    mc.content,
    1 - (mc.embedding <=> query_embedding) AS similarity
  FROM public.material_chunks mc
  WHERE
    mc.user_id = filter_user_id
    AND mc.embedding IS NOT NULL
    AND (
      filter_material_ids IS NULL
      OR mc.material_id = ANY(filter_material_ids)
    )
  ORDER BY mc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
