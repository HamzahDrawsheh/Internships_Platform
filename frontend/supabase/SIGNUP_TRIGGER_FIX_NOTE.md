# Signup Trigger Mismatch Fix

## Root cause

The project had two schema variants for `public.profiles.role`:

- `frontend/supabase/migrations/001_profiles.sql` creates `role` as enum (`public.role`)
- `frontend/supabase/migrations/20260312001500_full_schema.sql` expects `role` as `text`

`handle_new_auth_user()` writes `v_role` as `text`.  
If `profiles.role` is still enum, signup can fail with database trigger errors.

The full schema migration also had a broken policy snippet (`profiles_insert_trigger`) that prevented clean migration execution.

## Files changed

- `frontend/supabase/migrations/20260312001500_full_schema.sql`
  - fixed broken `profiles` insert policy section
  - added compatibility block to:
    - add `updated_at` if missing
    - convert enum `profiles.role` to `text` when needed
    - re-apply role check constraint

## What to run (manual if needed)

In Supabase SQL Editor, run the full contents of:

- `frontend/supabase/migrations/20260312001500_full_schema.sql`

or, if using CLI:

1. `npm run supabase:login`
2. `npm run supabase:link`
3. `npm run supabase:push`
