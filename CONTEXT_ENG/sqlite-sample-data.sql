-- =============================================================================
-- SQLite sample data for InternConnect Jordan
-- Run after schema: sqlite3 database.db < sqlite-sample-data.sql
-- =============================================================================

PRAGMA foreign_keys = ON;

-- 2 profiles (1 student, 1 company)
INSERT OR IGNORE INTO profiles (id, email, full_name, role, is_suspended) VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'student@example.com', 'Demo Student', 'student', 0),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'company@example.com', 'Demo Company', 'company', 0);

-- 1 internship (owned by company)
INSERT OR IGNORE INTO internships (id, company_id, title, description, location_type, skills, duration_weeks, open_positions, status) VALUES
  ('b2c3d4e5-0001-4000-8000-000000000001', 'a1b2c3d4-0002-4000-8000-000000000002', 'Data Science Intern', 'Work on ML pipelines and data analysis.', 'remote', '["Python","SQL","Machine Learning"]', 12, 2, 'active');

-- 1 application (student applied to internship)
INSERT OR IGNORE INTO applications (id, internship_id, student_id, status, cover_letter) VALUES
  ('c3d4e5f6-0001-4000-8000-000000000001', 'b2c3d4e5-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', 'submitted', 'I am interested in this role.');
