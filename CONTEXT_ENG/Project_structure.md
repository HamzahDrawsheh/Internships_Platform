# PROJECT STRUCTURE DOCUMENT
## InternConnect Jordan
### Codebase Structure (Next.js + Supabase)

---

**Version**  
1.1 — MVP (as-built)

**Date**  
May 2026

**Audience**  
Engineering Team

---

# 01 Repository Layout

The repository is organized as:

- `frontend/` → **full-stack Next.js application** (UI + API routes + shared libraries + Supabase migrations)
- `CONTEXT_ENG/` → product and technical context for planning and AI-assisted development

There is **no `backend/` folder**. Server-side logic lives in Next.js Route Handlers under `frontend/app/api/`.

```
Intrenships_Platform-1/
├── frontend/
│   ├── app/                    # App Router pages + API
│   ├── components/
│   ├── lib/
│   ├── supabase/migrations/    # Canonical DB schema
│   ├── public/
│   ├── middleware.ts
│   └── package.json
└── CONTEXT_ENG/
```

---

# 02 Frontend / Application Structure (Next.js)

We use the **Next.js App Router**. The `frontend/` directory is the entire deployable application—not “UI only.”

## 02.1 Pages (`frontend/app/`)

| Area | Path | Purpose |
|------|------|---------|
| Public | `/`, `/internships`, `/companies` | Landing, browse internships/companies |
| Auth | `/auth/login`, `/auth/signup`, `/auth/callback` | Supabase Auth flows |
| Student | `/dashboard/student`, `/applications`, `/resume-builder`, `/profile/student` | Student dashboard, apply, CV builder |
| Company | `/dashboard/company`, `/company/internships`, `/company/applications` | Company dashboard and hiring |
| Supervisor | `/dashboard/supervisor`, `/supervisor/students`, `/supervisor/internship-reports` | University supervisor tools |
| Admin | `/admin/*` | Platform administration |
| Settings | `/settings/notifications` | Notification preferences |

Role-specific sidebars live in `frontend/components/layout/` (`StudentSidebar`, `CompanySidebar`, etc.).

## 02.2 API Routes (`frontend/app/api/`)

Server-only logic (secrets, OpenAI, heavy processing):

| Route group | Examples | Purpose |
|-------------|----------|---------|
| `applications/` | `apply`, `commit` | Application submission and commitment flow |
| `recommendations/` | `internships`, `internships/[id]` | AI match scoring |
| `embeddings/` | `refresh`, `generate` | Student/internship vector embeddings |
| `ai/` | `cover-letter`, `task-to-skill` | AI-assisted student tools |
| `resume/` | `improve` | CV improvement suggestions |
| `chat/` | `student-assistant` | In-app student assistant |
| `notifications/` | `dispatch`, `process-email-queue` | Notification delivery |
| `email/` | `status`, `test`, `welcome` | Email infrastructure |
| `internship-reports/` | `[reportId]/pdf` | Report PDF generation |
| `company/` | `logo`, `applications/.../cv` | Company assets and CV access |
| `student-skills/` | `add-to-cv` | Merge verified skills into profile |
| `student-report-skills/` | `[skillId]` | Report skill management |
| `feedback/` | `analyze` | Feedback analysis |
| `dashboard/student/` | `weekly-insights` | Dashboard insights |

## 02.3 Components (`frontend/components/`)

Organized by domain:

- `layout/` — Navbar, sidebars, containers, page headers
- `ui/` — Shared primitives (Button, Input, Modal, …)
- `internships/`, `applications/`, `companies/`, `dashboard/`, `internship-reports/`, `messaging/`, `student/`, `cv/`, …

## 02.4 Libraries (`frontend/lib/`)

| Folder | Purpose |
|--------|---------|
| `supabase/` | Browser, server, and admin Supabase clients |
| `ai/` | Embeddings, match insights, cover letter, task-to-skill |
| `companies/`, `recommendations/`, `internship-reports/` | Domain logic |
| `dashboard/` | Dashboard snapshots, sync, widgets |
| `cv/` | CV builder PDF, persistence, formatting |
| `i18n/` | English / Arabic messages and context |
| `email/`, `notifications/` | Email and notification delivery |
| `server/` | Rate limiting and server utilities |

## 02.5 Database (`frontend/supabase/`)

- **`migrations/`** — **Canonical schema.** All new DB changes go here as timestamped SQL files.
- Apply locally or to remote: `npm run supabase:push` (from `frontend/`).

Legacy draft SQL files under `CONTEXT_ENG/` are **not** authoritative—do not run them on production.

---

# 03 Backend / Server Logic

There is no FastAPI service. “Backend” responsibilities are split as follows:

| Responsibility | Where |
|----------------|--------|
| Auth sessions | Supabase Auth |
| Data storage + RLS | Supabase PostgreSQL |
| File storage | Supabase Storage |
| Business rules (simple CRUD) | Client + RLS policies |
| Business rules (sensitive/complex) | `frontend/app/api/*` Route Handlers |
| AI, email, PDFs, embeddings | `frontend/lib/*` called from Route Handlers |

Route Handlers use `createClient()` from `@/lib/supabase/server` for the authenticated user, and `@/lib/supabase/admin` when service-role access is required.

---

# 04 Documentation Structure (CONTEXT_ENG)

```
CONTEXT_ENG/
├── PRD.md
├── Implementation.md
├── UI_UX_doc.md
├── Project_structure.md   # this file
└── Bug_tracking.md
```

These files are the authoritative project context for planning, building with AI tools (Cursor), and keeping implementation aligned with the PRD.

---

# 05 Naming Conventions

**Next.js / React**
- Pages: `page.tsx`, layouts: `layout.tsx`
- Dynamic routes: `[id]`, `[internshipId]`, etc.
- Components: PascalCase (`InternshipCard.tsx`)
- Shared UI: `frontend/components/ui/`
- Domain logic: `frontend/lib/<domain>/`

**Styling**
- Tailwind CSS utility classes
- Reusable UI in `components/ui/` and domain folders
- Avoid large custom CSS files unless necessary

**API routes**
- One `route.ts` per HTTP method folder (`GET`, `POST`, …)
- Group by domain under `app/api/`

**Database**
- Migrations: `YYYYMMDDHHMMSS_description.sql`
- Prefer RPC functions + RLS over bypassing security from the client

---

# 06 Data Access Patterns

## Direct Supabase (browser)

Many pages call `createClient()` from `@/lib/supabase/client` and query tables directly. Security is enforced by **Row Level Security** policies defined in migrations.

## Server routes

Used when the operation requires:
- OpenAI or other secret API keys
- Service-role Supabase access
- Email sending, PDF generation, rate limiting
- Multi-step server orchestration

## Recommendations / matching

- Vector similarity: `students.embedding` vs `internship_positions.embedding`
- Skill overlap: `lib/skill-match.ts`, `lib/ai/match-insights.ts`
- Profile/CV fields feed embeddings via `/api/embeddings/refresh`

---

# 07 Supabase Responsibilities

Supabase handles:

- Auth users and sessions
- PostgreSQL database (RLS enabled)
- Storage for student CVs and company logos
- Realtime (where used)

Next.js Route Handlers handle:

- OpenAI calls (CV improve, cover letter, assistant, embeddings)
- Email dispatch
- PDF generation for reports
- Operations that must not expose secrets to the browser

---

# 08 Environment Variables

Configure in `frontend/.env.local` (never commit). Typical keys:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server only)
- `OPENAI_API_KEY`
- SMTP / `RESEND_API_KEY` for email

See `frontend/.env.example` if present, and deployment docs for production.

---

# 09 Future Considerations

A separate Python/FastAPI backend is **not required** for the current MVP. Consider extracting one only if you need:

- Shared REST API for a native mobile app
- Long-running background workers isolated from Next.js
- Python-only ML pipelines

Until then, extend `frontend/app/api/` and `frontend/lib/` instead of introducing a second server.
