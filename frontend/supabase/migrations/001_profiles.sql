-- Run this in Supabase SQL Editor to create the profiles table.
-- If you already have a profiles table with a different schema, drop it first:
--   DROP TABLE IF EXISTS public.profiles CASCADE;
-- Then run this script. After running, go to Dashboard → API Settings → "Reload schema cache" if needed.

CREATE TYPE IF NOT EXISTS public.role AS ENUM
  ('student', 'company', 'supervisor', 'admin');

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.role NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  is_suspended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running (for profiles created with older schema)
DROP POLICY IF EXISTS "Users can read and update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can read and update own profile"
ON public.profiles
FOR ALL
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
