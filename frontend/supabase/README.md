# Supabase project link and migrations

This folder now contains migration files so you do not need to paste SQL manually in the Supabase dashboard.

## One-time setup

From `frontend/`:

1. Login to Supabase CLI:
   - `npm run supabase:login`
2. Link this repo to your Supabase project:
   - `npm run supabase:link`

## Apply schema changes

Run:

- `npm run supabase:push`

This applies files in `supabase/migrations/` (including `20260312001500_full_schema.sql`) to the linked Supabase project.

## Notes

- Project ref used by link script: `frwwmxaondxvknjsazgt`
- If your database already has different table structures, review and back up before running push.
