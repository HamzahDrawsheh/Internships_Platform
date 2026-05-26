-- Deprecated schema draft (kept for reference only).
-- Do not run this file for current app versions.
-- Use Supabase migrations in `frontend/supabase/migrations/` (canonical).

-- 1) Profiles (auth-linked)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  role text check (role in ('student', 'company', 'supervisor', 'admin')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- 2) Internships (company_id = profiles.id of company user)
create table if not exists public.internships (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  location_type text check (location_type in ('remote', 'onsite', 'hybrid')),
  skills text[] default '{}',
  duration_weeks int,
  start_date date,
  deadline date,
  open_positions int default 1,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'closed', 'pending')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.internships enable row level security;

-- Anyone authenticated can read active internships (browse)
create policy "Anyone can read active internships"
  on public.internships for select
  using (auth.role() = 'authenticated' and (status = 'active' or company_id = auth.uid()));

-- Company can insert/update/delete own internships
create policy "Company can manage own internships"
  on public.internships for all
  using (company_id = auth.uid());

-- 3) Applications
create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  internship_id uuid not null references public.internships (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'accepted', 'rejected')),
  cover_letter text,
  created_at timestamptz default now(),
  unique (internship_id, student_id)
);

alter table public.applications enable row level security;

-- Student can read/insert own applications
create policy "Student can view own applications"
  on public.applications for select using (student_id = auth.uid());
create policy "Student can insert own application"
  on public.applications for insert with check (student_id = auth.uid());

-- Company can read/update applications for their internships (via join)
create policy "Company can view applications for own internships"
  on public.applications for select
  using (
    exists (
      select 1 from public.internships i
      where i.id = applications.internship_id and i.company_id = auth.uid()
    )
  );
create policy "Company can update applications for own internships"
  on public.applications for update
  using (
    exists (
      select 1 from public.internships i
      where i.id = applications.internship_id and i.company_id = auth.uid()
    )
  );
