# Step 1 — Project Analysis

**Date:** March 12, 2026  
**Purpose:** Analyze existing project structure, frontend, and database to recommend backend stack.

---

## 1. Project structure (scanned)

```
Intrenships_Platform/
├── frontend/                 # Next.js application
│   ├── app/                  # App Router (auth, dashboard, internships, applications, admin, company, supervisor)
│   ├── components/           # UI components (auth, layout, internships, applications, common)
│   ├── lib/                  # Supabase client, auth helpers, types
│   ├── hooks/                # useAuth, etc.
│   └── package.json
├── CONTEXT_ENG/              # Context and schema docs
│   ├── sqlite-schema.sql     # SQLite DDL
│   ├── sqlite-sample-data.sql
│   ├── SQLITE_SETUP.md
│   ├── DATABASE_SCHEMA_ANALYSIS.md  # (PostgreSQL reference; we use SQLite)
│   └── supabase-schema-complete.sql # (PostgreSQL; not used for backend)
└── (no backend folder yet)
```

---

## 2. Frontend identification

| Item | Details |
|------|--------|
| **Framework** | **Next.js 16** (App Router) |
| **UI** | React 19, TypeScript, Tailwind CSS 4 |
| **Current data/auth** | **Supabase** (`@supabase/supabase-js`, `@supabase/ssr`) — auth (login/signup/session) and data via `.from('profiles'|'internships'|'applications')` |
| **Domain types** | `frontend/lib/types.ts`: `Internship`, `Application`, `LocationType`, `ApplicationStatus`, `InternshipStatus`, `ProfileRole` |

**Data usage in frontend:**

- **profiles:** create (onboarding, create-demo), read (session/user)
- **internships:** list, get by id, create, update; filtered by company
- **applications:** list (per student, per internship), create, update status

So the backend must expose REST (or equivalent) for **profiles**, **internships**, and **applications** that the frontend can call instead of Supabase client.

---

## 3. Database schema (SQLite)

**Source:** `CONTEXT_ENG/sqlite-schema.sql`

| Table | Purpose | Key columns |
|-------|---------|-------------|
| **profiles** | One row per user | `id` (TEXT PK), `email`, `full_name`, `role` (student/company/supervisor/admin), `is_suspended`, `created_at`, `updated_at` |
| **internships** | Company postings | `id` (TEXT PK), `company_id` → profiles, `title`, `description`, `location_type`, `skills` (JSON text), `duration_weeks`, `start_date`, `deadline`, `open_positions`, `status`, timestamps |
| **applications** | Student applications | `id` (TEXT PK), `internship_id`, `student_id`, `status`, `cover_letter`, `created_at`; UNIQUE(internship_id, student_id) |

**SQLite type mapping (already applied in schema):**

- UUID → TEXT (app-generated)
- timestamptz → TEXT (ISO8601 / `datetime('now')`)
- boolean → INTEGER (0/1)
- text[] → TEXT (JSON array)
- date → TEXT (YYYY-MM-DD)

**Relationships:** profiles 1:N internships (company), profiles 1:N applications (student), internships 1:N applications; FK with ON DELETE CASCADE.

---

## 4. Backend stack recommendation

**Recommendation: Node.js (Express or Fastify) with TypeScript**

**Reasons:**

1. **Same language as frontend** — TypeScript types in `frontend/lib/types.ts` can be shared or mirrored in the backend (single ecosystem, easier maintenance).
2. **Existing team context** — Next.js + TS suggests comfort with Node/TS; no second language/runtime.
3. **SQLite from Node** — Excellent support via `better-sqlite3` (sync, fast) or `sql.js` (WASM, no native deps). Schema and setup already documented in `CONTEXT_ENG/SQLITE_SETUP.md`.
4. **API shape** — REST is straightforward; later you can add OpenAPI and/or client generation from shared types.
5. **Auth** — Frontend currently uses Supabase Auth. Options: (A) Keep Supabase Auth and have the backend **verify Supabase JWT** and map to `profiles.id`, or (B) implement backend auth (sessions/JWT) and migrate later. Recommendation: start with (A) if you keep Supabase for auth; otherwise (B) in Step 2.

**Alternative: Python FastAPI**

- Use if the team prefers Python or plans to add ML/data pipelines.
- Pros: Fast API development, automatic OpenAPI, strong typing.
- Cons: Two languages, no direct type sharing with Next.js; need to keep DTOs in sync manually or via codegen.

**Summary:** Prefer **Node.js + Express (or Fastify) + TypeScript + SQLite (e.g. better-sqlite3)** for this project. Use **FastAPI** only if Python is a requirement.

---

## 5. Artifacts and next step

**Created in this step:**

- **File added:** `CONTEXT_ENG/BACKEND_STEP1_ANALYSIS.md` (this document).

**Next step (Step 2 — Backend architecture):**

- Define folder structure for the backend.
- Design API (REST resources and main endpoints for profiles, internships, applications).
- Plan database access layer (connection, queries, optional repository pattern).
- Decide authentication approach (Supabase JWT validation vs. backend-owned auth).
- Define environment configuration (e.g. `DATABASE_PATH`, `PORT`, optional `SUPABASE_JWT_SECRET`).

**Waiting for your confirmation before proceeding to Step 2.**
