# Database Schema Analysis — Internships Platform

**Important:** This project does **not** use SQLite. It uses **Supabase (PostgreSQL)**. The schema is defined in SQL files and applied in the Supabase Dashboard. This document analyzes the **PostgreSQL** schema from `CONTEXT_ENG/supabase-schema-complete.sql`.

---

## 1. All tables in the database

| # | Table name   | Purpose |
|---|--------------|---------|
| 1 | `auth.users` | Supabase built-in; stores authenticated users (referenced by profiles). |
| 2 | `public.profiles` | One row per user: role, name, email; links to `auth.users`. |
| 3 | `public.internships` | Internship listings; each belongs to a company (profile). |
| 4 | `public.applications` | Student applications to internships. |

**User-defined tables (in `public`):** `profiles`, `internships`, `applications`.

---

## 2. Per-table: columns, types, primary keys, foreign keys

### Table: `public.profiles`

| Column       | Data type   | Nullable | Default   | Notes |
|-------------|-------------|----------|-----------|--------|
| `id`        | uuid        | NOT NULL | —         | **PK**, FK → `auth.users(id)` ON DELETE CASCADE |
| `email`     | text        | YES      | —         | |
| `full_name` | text        | YES      | —         | |
| `role`      | text        | YES      | —         | CHECK: `'student' \| 'company' \| 'supervisor' \| 'admin'` |
| `is_suspended` | boolean   | NOT NULL | false     | |
| `created_at`  | timestamptz | NOT NULL | now()     | |
| `updated_at`  | timestamptz | NOT NULL | now()     | |

- **Primary key:** `id`
- **Foreign keys:** `id` → `auth.users(id)` ON DELETE CASCADE

---

### Table: `public.internships`

| Column          | Data type   | Nullable | Default   | Notes |
|-----------------|-------------|----------|-----------|--------|
| `id`            | uuid        | NOT NULL | gen_random_uuid() | **PK** |
| `company_id`    | uuid        | NOT NULL | —         | FK → `public.profiles(id)` ON DELETE CASCADE |
| `title`         | text        | NOT NULL | —         | |
| `description`   | text        | YES      | —         | |
| `location_type` | text        | YES      | —         | CHECK: `'remote' \| 'onsite' \| 'hybrid'` |
| `skills`        | text[]      | NOT NULL | '{}'      | |
| `duration_weeks`| int         | YES      | —         | |
| `start_date`    | date        | YES      | —         | |
| `deadline`      | date        | YES      | —         | |
| `open_positions`| int         | NOT NULL | 1         | |
| `status`        | text        | NOT NULL | 'draft'   | CHECK: `'draft' \| 'active' \| 'paused' \| 'closed' \| 'pending'` |
| `created_at`    | timestamptz | NOT NULL | now()     | |
| `updated_at`    | timestamptz | NOT NULL | now()     | |

- **Primary key:** `id`
- **Foreign keys:** `company_id` → `public.profiles(id)` ON DELETE CASCADE

---

### Table: `public.applications`

| Column          | Data type   | Nullable | Default    | Notes |
|-----------------|-------------|----------|------------|--------|
| `id`            | uuid        | NOT NULL | gen_random_uuid() | **PK** |
| `internship_id` | uuid        | NOT NULL | —          | FK → `public.internships(id)` ON DELETE CASCADE |
| `student_id`    | uuid        | NOT NULL | —          | FK → `public.profiles(id)` ON DELETE CASCADE |
| `status`        | text        | NOT NULL | 'submitted'| CHECK: `'submitted' \| 'under_review' \| 'accepted' \| 'rejected'` |
| `cover_letter`  | text        | YES      | —          | |
| `created_at`    | timestamptz | NOT NULL | now()      | — |

- **Primary key:** `id`
- **Foreign keys:**
  - `internship_id` → `public.internships(id)` ON DELETE CASCADE
  - `student_id` → `public.profiles(id)` ON DELETE CASCADE
- **Unique constraint:** `(internship_id, student_id)` — one application per student per internship

---

## 3. SQL schema (CREATE TABLE statements)

### `public.profiles`

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  full_name text,
  role text CHECK (role IN ('student', 'company', 'supervisor', 'admin')),
  is_suspended boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### `public.internships`

```sql
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
```

### `public.applications`

```sql
CREATE TABLE IF NOT EXISTS public.applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES public.internships (id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected')),
  cover_letter text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (internship_id, student_id)
);
```

---

## 4. Sample data (first 5 rows per table)

**Note:** There is no local SQLite (or local PostgreSQL) database in the repo. Data lives in your **Supabase project**. To get sample rows:

1. Open **Supabase Dashboard** → **Table Editor**, or  
2. Run in **SQL Editor**:

```sql
-- Sample from profiles (first 5)
SELECT * FROM public.profiles ORDER BY created_at LIMIT 5;

-- Sample from internships (first 5)
SELECT * FROM public.internships ORDER BY created_at LIMIT 5;

-- Sample from applications (first 5)
SELECT * FROM public.applications ORDER BY created_at LIMIT 5;
```

If you have run the **Create Demo** flow in the app (`/api/create-demo`), you will have demo users in `profiles`, demo internships in `internships`, and demo rows in `applications`. Otherwise, tables may be empty until you sign up and create data.

---

## 5. Relationships between tables

```
┌─────────────────┐
│  auth.users     │  (Supabase built-in)
│  id (PK)        │
└────────┬────────┘
         │ 1:1
         ▼
┌─────────────────┐
│ public.profiles │
│  id (PK, FK)    │◄──────────────────────────────────┐
│  email          │                                    │
│  full_name      │                                    │
│  role           │                                    │
└────┬───────┬────┘                                    │
     │       │                                          │
     │ 1:N   │ N:1 (as company)                         │ N:1 (as student)
     ▼       ▼                                          │
┌─────────────────┐       ┌─────────────────┐          │
│ internships     │  1:N  │ applications     │          │
│  id (PK)        │◄──────│  id (PK)        │          │
│  company_id (FK)│       │  internship_id  │──────────┘
│  title          │       │  student_id (FK)│──────────┐
│  status         │       │  status         │          │
│  ...            │       │  cover_letter  │          │
└─────────────────┘       └────────────────┘          │
                                                       │
                                    (profiles.id) ◄────┘
```

### Description

- **auth.users → profiles (1:1)**  
  Every row in `public.profiles` has `id` = one `auth.users.id`. Profiles extend auth with role, name, email. Delete user → profile row is removed (CASCADE).

- **profiles → internships (1:N)**  
  `internships.company_id` = `profiles.id` (company). One company (profile) has many internships. Delete profile → their internships are deleted (CASCADE).

- **profiles → applications (1:N)**  
  `applications.student_id` = `profiles.id`. One student (profile) has many applications. Delete profile → their applications are deleted (CASCADE).

- **internships → applications (1:N)**  
  `applications.internship_id` = `internships.id`. One internship has many applications. Delete internship → its applications are deleted (CASCADE).

- **Unique on applications**  
  `UNIQUE (internship_id, student_id)` ensures at most one application per student per internship.

### Summary

| From table   | To table      | Relationship | Foreign key    |
|-------------|---------------|--------------|----------------|
| auth.users  | profiles      | 1:1          | profiles.id    |
| profiles    | internships   | 1:N (company)| internships.company_id |
| profiles    | applications  | 1:N (student)| applications.student_id |
| internships | applications  | 1:N          | applications.internship_id |

---

## Reference: no SQLite in this project

- **Database:** Supabase (PostgreSQL).  
- **Schema source:** `CONTEXT_ENG/supabase-schema-complete.sql` (and optional migrations under `frontend/supabase/`).  
- **Sample data:** Query your Supabase project as above; no local `.db` or SQLite files exist in the repo.
