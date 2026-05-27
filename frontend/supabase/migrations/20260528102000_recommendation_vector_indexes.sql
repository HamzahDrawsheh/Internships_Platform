-- Add vector indexes for public-scale recommendation reads when pgvector
-- operator classes are available in the Supabase project.

do $$
begin
  if exists (
    select 1
    from pg_opclass
    inner join pg_am on pg_am.oid = pg_opclass.opcmethod
    where opcname = 'vector_cosine_ops'
      and pg_am.amname = 'hnsw'
  ) then
    begin
      execute 'create index if not exists idx_internship_positions_embedding_hnsw on public.internship_positions using hnsw (embedding vector_cosine_ops)';
      execute 'create index if not exists idx_students_embedding_hnsw on public.students using hnsw (embedding vector_cosine_ops)';
    exception
      when undefined_object or feature_not_supported then
        raise notice 'Skipping hnsw vector indexes because this Supabase pgvector build does not support vector_cosine_ops for hnsw.';
    end;
  end if;
end;
$$;

create index if not exists idx_internship_positions_active_embedding_updated
  on public.internship_positions(is_active, embedding_updated_at desc)
  where embedding is not null;

create index if not exists idx_students_user_embedding_updated
  on public.students(user_id, embedding_updated_at desc)
  where embedding is not null;
