# SQLite schema setup — InternConnect Jordan

This folder contains a **SQLite-compatible** version of the PostgreSQL (Supabase) schema for **profiles**, **internships**, and **applications**.

---

## Files

| File | Purpose |
|------|--------|
| `sqlite-schema.sql` | CREATE TABLE statements, CHECK constraints, foreign keys. Run first. |
| `sqlite-sample-data.sql` | Optional sample rows (2 profiles, 1 internship, 1 application). Run after schema. |
| `SQLITE_SETUP.md` | This file — how to create and use `database.db`. |

---

## Type conversions (PostgreSQL → SQLite)

| PostgreSQL | SQLite | Notes |
|------------|--------|--------|
| `uuid` | `TEXT` | Store UUID strings; generate in app (e.g. `crypto.randomUUID()` in Node/browser). |
| `gen_random_uuid()` | — | No default in SQLite; application must supply `id` on INSERT. |
| `timestamptz` | `TEXT` | Use `datetime('now')` or ISO8601 strings. |
| `boolean` | `INTEGER` | `0` = false, `1` = true. |
| `text[]` | `TEXT` | Store JSON array, e.g. `'["Python","SQL"]'`. |
| `date` | `TEXT` | ISO date `'YYYY-MM-DD'`. |

---

## How to create `database.db`

### Option 1: Command line (sqlite3)

From the **project root** (or from `CONTEXT_ENG`):

```bash
# Create database and load schema
sqlite3 database.db < CONTEXT_ENG/sqlite-schema.sql

# Optional: load sample data
sqlite3 database.db < CONTEXT_ENG/sqlite-sample-data.sql
```

If you are already inside `CONTEXT_ENG`:

```bash
cd CONTEXT_ENG
sqlite3 database.db < sqlite-schema.sql
sqlite3 database.db < sqlite-sample-data.sql
```

### Option 2: sqlite3 interactive shell

```bash
sqlite3 database.db
```

Then inside the shell:

```sql
.read sqlite-schema.sql
.read sqlite-sample-data.sql
.quit
```

### Option 3: From Node.js (optional)

If you use `better-sqlite3` or `sql.js`:

```js
const Database = require('better-sqlite3');
const fs = require('fs');
const db = new Database('database.db');
const schema = fs.readFileSync('CONTEXT_ENG/sqlite-schema.sql', 'utf8');
db.exec(schema);
// Optional: db.exec(fs.readFileSync('CONTEXT_ENG/sqlite-sample-data.sql', 'utf8'));
db.close();
```

---

## Verify the database

```bash
sqlite3 database.db
```

```sql
PRAGMA foreign_keys = ON;
.tables
-- Should list: applications  internships  profiles

.schema profiles
.schema internships
.schema applications

-- If you loaded sample data:
SELECT * FROM profiles;
SELECT * FROM internships;
SELECT * FROM applications;
.quit
```

---

## Relationships (unchanged)

- **profiles.id** ← `internships.company_id` (company owns internships)
- **profiles.id** ← `applications.student_id` (student made the application)
- **internships.id** ← `applications.internship_id` (application is for this internship)

All foreign keys use `ON DELETE CASCADE`. Enforce them with:

```sql
PRAGMA foreign_keys = ON;
```

(Already included at the top of `sqlite-schema.sql` and `sqlite-sample-data.sql`.)

---

## Generating UUIDs for inserts

SQLite does not have `gen_random_uuid()`. When inserting, generate the `id` in your application, for example:

- **Node.js:** `crypto.randomUUID()` or package `uuid`
- **Browser:** `crypto.randomUUID()`
- **SQLite (one-off):** `lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab', abs(random()) % 4 + 1, 1) || lower(hex(randomblob(2))) || '-' || lower(hex(randomblob(6)))`

Sample insert with app-generated ID:

```sql
INSERT INTO profiles (id, email, full_name, role) VALUES
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'new@example.com', 'New User', 'student');
```
