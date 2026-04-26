-- Phase 1: database preparation for AI recommender embeddings only.
-- This migration intentionally does NOT add joins, embedding generation,
-- or recommendation logic.

-- Ensure pgvector is available.
create extension if not exists vector;

-- Add embedding + refresh timestamp to internship positions.
alter table if exists public.internship_positions
  add column if not exists embedding vector(1536),
  add column if not exists embedding_updated_at timestamptz;

-- Add embedding + refresh timestamp to students (combined student embedding).
alter table if exists public.students
  add column if not exists embedding vector(1536),
  add column if not exists embedding_updated_at timestamptz;

-- Vector similarity indexes (IVFFlat + cosine distance).
-- Note: ivfflat works best when table has enough rows and index is analyzed.
create index if not exists idx_internship_positions_embedding_ivfflat
  on public.internship_positions
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create index if not exists idx_students_embedding_ivfflat
  on public.students
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);
