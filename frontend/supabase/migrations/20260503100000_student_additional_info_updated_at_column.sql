-- Fix: trigger trg_student_additional_info_set_updated_at expects NEW.updated_at.
-- Older databases may have student_additional_info without this column (CREATE TABLE IF NOT EXISTS
-- does not add columns when the table already existed).

alter table public.student_additional_info
  add column if not exists updated_at timestamptz not null default now();
