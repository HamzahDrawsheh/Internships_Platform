-- =============================================================================
-- InternConnect Jordan — Complete Supabase PostgreSQL Schema
-- =============================================================================
-- Run this entire script in Supabase Dashboard → SQL Editor.
-- Safe to re-run: uses IF NOT EXISTS and DROP POLICY IF EXISTS.
-- For a completely fresh DB, run as-is. If you already have tables with different
-- structure, drop them first in order: applications → internships → profiles.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. PROFILES (auth-linked; one row per auth.users)
-- -----------------------------------------------------------------------------
-- Used by: auth callback, onboarding, middleware, dashboard, applications join.
-- Columns: id, email, full_name, role (nullable until onboarding), updated_at, is_suspended.
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text CHECK (role IN ('student', 'company', 'supervisor', 'admin')),
  is_suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Auto-set updated_at on profile changes (used by lib/auth.ts)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 2. INTERNSHIPS (company postings; company_id = profiles.id of company user)
-- -----------------------------------------------------------------------------
-- Used by: company dashboard/list, browse (future), applications join.
CREATE TABLE IF NOT EXISTS public.internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location_type text CHECK (location_type IN ('remote', 'onsite', 'hybrid')),
  skills text[] NOT NULL DEFAULT '{}',
  duration_weeks int,
  start_date date,
  deadline date,
  open_positions int NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'pending')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read active internships (browse) or their own (company)
DROP POLICY IF EXISTS "Anyone can read active or own internships" ON public.internships;
CREATE POLICY "Anyone can read active or own internships"
  ON public.internships FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (status = 'active' OR company_id = auth.uid())
  );

-- Company can insert/update/delete own internships
DROP POLICY IF EXISTS "Company can manage own internships" ON public.internships;
CREATE POLICY "Company can manage own internships"
  ON public.internships FOR ALL
  USING (company_id = auth.uid())
  WITH CHECK (company_id = auth.uid());

-- Optional: auto-set updated_at on internships
DROP TRIGGER IF EXISTS internships_updated_at ON public.internships;
CREATE TRIGGER internships_updated_at
  BEFORE UPDATE ON public.internships
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 3. APPLICATIONS (student applies to internship)
-- -----------------------------------------------------------------------------
-- Used by: student applications list, company applicants list, counts.
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES public.internships (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected')),
  cover_letter text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (internship_id, student_id)
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Student can read and insert own applications
DROP POLICY IF EXISTS "Student can view own applications" ON public.applications;
CREATE POLICY "Student can view own applications"
  ON public.applications FOR SELECT
  USING (student_id = auth.uid());

DROP POLICY IF EXISTS "Student can insert own application" ON public.applications;
CREATE POLICY "Student can insert own application"
  ON public.applications FOR INSERT
  WITH CHECK (student_id = auth.uid());

-- Company can read/update applications for their internships
DROP POLICY IF EXISTS "Company can view applications for own internships" ON public.applications;
CREATE POLICY "Company can view applications for own internships"
  ON public.applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.internships i
      WHERE i.id = applications.internship_id AND i.company_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Company can update applications for own internships" ON public.applications;
CREATE POLICY "Company can update applications for own internships"
  ON public.applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.internships i
      WHERE i.id = applications.internship_id AND i.company_id = auth.uid()
    )
  );
