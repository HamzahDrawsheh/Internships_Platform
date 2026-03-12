-- =============================================================================
-- InternConnect Jordan — SQLite Schema (converted from PostgreSQL/Supabase)
-- =============================================================================
-- Run this file to create database.db or initialize an existing SQLite database.
-- Usage: sqlite3 database.db < sqlite-schema.sql
-- Or from sqlite3 CLI: .read sqlite-schema.sql
--
-- Type mappings applied:
--   uuid → TEXT (application must generate UUIDs on insert)
--   timestamptz → TEXT (ISO8601 via datetime('now'))
--   boolean → INTEGER (0 = false, 1 = true)
--   text[] (PostgreSQL array) → TEXT (JSON array e.g. '["Python","SQL"]')
--   date → TEXT (ISO date 'YYYY-MM-DD')
-- =============================================================================

PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- 1. PROFILES (one row per user; id is application-generated UUID as TEXT)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT CHECK (role IN ('student', 'company', 'supervisor', 'admin')),
  is_suspended INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------------------
-- 2. INTERNSHIPS (company postings; company_id references profiles.id)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS internships (
  id TEXT PRIMARY KEY,
  company_id TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location_type TEXT CHECK (location_type IN ('remote', 'onsite', 'hybrid')),
  skills TEXT NOT NULL DEFAULT '[]',
  duration_weeks INTEGER,
  start_date TEXT,
  deadline TEXT,
  open_positions INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed', 'pending')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- -----------------------------------------------------------------------------
-- 3. APPLICATIONS (student applies to internship)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  internship_id TEXT NOT NULL REFERENCES internships (id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected')),
  cover_letter TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (internship_id, student_id)
);

-- Note: SQLite does not support updating NEW.updated_at in a trigger without
-- causing recursion. The application should set updated_at = datetime('now')
-- when updating rows in profiles and internships.

-- =============================================================================
-- Optional: sample insert data (uncomment to load)
-- =============================================================================
-- IDs are example UUIDs; use your app or hex(randomblob(16)) for real data.

/*
-- Sample profiles (1 student, 1 company)
INSERT OR IGNORE INTO profiles (id, email, full_name, role, is_suspended) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'student@example.com', 'Demo Student', 'student', 0),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'company@example.com', 'Demo Company', 'company', 0);

-- Sample internship (owned by company)
INSERT OR IGNORE INTO internships (id, company_id, title, description, location_type, skills, duration_weeks, open_positions, status) VALUES
  ('b2c3d4e5-0001-4000-8000-000000000001', 'a1b2c3d4-0002-4000-8000-000000000002', 'Data Science Intern', 'Work on ML pipelines.', 'remote', '["Python","SQL"]', 12, 2, 'active');

-- Sample application (student applied to internship)
INSERT OR IGNORE INTO applications (id, internship_id, student_id, status) VALUES
  ('c3d4e5f6-0001-4000-8000-000000000001', 'b2c3d4e5-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'submitted');
*/
