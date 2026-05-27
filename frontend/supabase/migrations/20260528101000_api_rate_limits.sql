-- Shared API rate-limit counters for serverless-safe abuse control.

create table if not exists public.api_rate_limits (
  key text primary key,
  bucket text not null,
  subject text not null,
  window_start timestamptz not null,
  hit_count integer not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_api_rate_limits_bucket_updated
  on public.api_rate_limits(bucket, updated_at desc);

alter table public.api_rate_limits enable row level security;

drop policy if exists "api_rate_limits_deny_all" on public.api_rate_limits;
create policy "api_rate_limits_deny_all"
on public.api_rate_limits
for all
using (false)
with check (false);

create or replace function public.consume_api_rate_limit(
  p_key text,
  p_bucket text,
  p_subject text,
  p_max_requests integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := now();
  v_window_start timestamptz := now();
  v_count integer;
begin
  if p_key is null or trim(p_key) = '' then
    return false;
  end if;
  if p_max_requests <= 0 or p_window_seconds <= 0 then
    return false;
  end if;

  insert into public.api_rate_limits as r (
    key,
    bucket,
    subject,
    window_start,
    hit_count,
    updated_at
  )
  values (
    p_key,
    p_bucket,
    p_subject,
    v_now,
    1,
    v_now
  )
  on conflict (key) do update
  set
    window_start = case
      when r.window_start <= v_now - make_interval(secs => p_window_seconds)
        then v_now
      else r.window_start
    end,
    hit_count = case
      when r.window_start <= v_now - make_interval(secs => p_window_seconds)
        then 1
      else r.hit_count + 1
    end,
    bucket = excluded.bucket,
    subject = excluded.subject,
    updated_at = v_now
  returning hit_count, window_start
  into v_count, v_window_start;

  return v_count <= p_max_requests;
end;
$$;

revoke all on function public.consume_api_rate_limit(text, text, text, integer, integer) from public;
grant execute on function public.consume_api_rate_limit(text, text, text, integer, integer) to service_role;
