-- ─────────────────────────────────────────────────────────────────────────────
-- Document Processing Metadata Schema
-- Migration: 20260903_document_processing.sql
--
-- Adds:
--   1. Processing status enum
--   2. Metadata columns to public.materials
--   3. Optional structural metadata columns to material_chunks
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Processing status enum
DO $$ BEGIN
    CREATE TYPE processing_status AS ENUM ('pending', 'processing', 'ready', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add metadata columns to public.materials
ALTER TABLE public.materials
  ADD COLUMN IF NOT EXISTS processing_status processing_status DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS processing_errors text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_pages integer,
  ADD COLUMN IF NOT EXISTS total_chunks integer;

-- 3. Add structural metadata columns to public.material_chunks
-- (In case they weren't added in the initial RAG migration)
ALTER TABLE public.material_chunks
  ADD COLUMN IF NOT EXISTS section_title text,
  ADD COLUMN IF NOT EXISTS page_number integer,
  ADD COLUMN IF NOT EXISTS section_index integer;
