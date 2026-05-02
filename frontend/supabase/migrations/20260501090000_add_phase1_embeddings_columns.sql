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

-- Vector indexes are intentionally deferred because this Supabase pgvector build does not expose vector_cosine_ops for ivfflat/hnsw. Similarity RPCs still work without indexes but may be slower.
