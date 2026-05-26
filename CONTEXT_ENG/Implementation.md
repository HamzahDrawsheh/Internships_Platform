# IMPLEMENTATION DOCUMENT
## InternConnect Jordan
### Technical Implementation Plan
**Next.js · Supabase**

---

**Version**  
1.1 — As-built (MVP)

**Date**  
May 2026

**Status**  
Living document — reflects current repository

**Prepared By**  
Engineering Team

**Audience**  
Developers, System Architects

---

# 01 System Overview

InternConnect Jordan is implemented as a **full-stack Next.js web application** backed by **Supabase**, connecting AI and Data Science students with companies offering internships in Jordan.

The system uses a **two-layer application architecture**:

1. **Next.js application** (`frontend/`) — UI, routing, client logic, and server Route Handlers
2. **Supabase platform** — PostgreSQL, Auth, Storage, Row Level Security

There is **no separate FastAPI/Python server** in this repository. Server-side business logic that requires secrets or privileged access lives in **Next.js API routes** under `frontend/app/api/`.

This keeps deployment simple (one Node app + managed Supabase) while remaining secure via RLS and server-only API keys.

---

# 02 Technology Stack

### Web application
**Next.js 16** with **TypeScript**, **React 19**, **Tailwind CSS 4**

Responsibilities:
- User interface and client routing
- Form handling and UI state
- Direct Supabase client access (RLS-protected)
- Server Route Handlers for AI, email, PDFs, embeddings, sensitive flows

### Styling

The project uses **Tailwind CSS** as the primary styling framework.

Rules:
- All UI styling must use Tailwind utility classes.
- Avoid writing custom CSS unless absolutely necessary.
- Reusable UI components live in `frontend/components/ui/` and domain folders.
- Responsive design uses Tailwind breakpoints (`sm`, `md`, `lg`, `xl`).

### Data & auth platform
**Supabase**

| Service | Use |
|---------|-----|
| PostgreSQL | All application data |
| Auth | Email/password, JWT sessions |
| Storage | Student CVs, company logos |
| RLS | Per-role data access policies |

### AI & integrations (server-side only)
- **OpenAI** — embeddings, CV improve, cover letter, task-to-skill, student assistant, feedback analysis
- **SMTP / Resend** — transactional email (via Route Handlers)

---

# 03 System Architecture

```
Browser
  ├─► Next.js pages (React UI)
  ├─► Supabase client (auth + direct DB/storage, protected by RLS)
  └─► /app/api/* Route Handlers
         ├─► Supabase (user client or service role)
         ├─► OpenAI
         └─► Email providers
```

**Direct Supabase from the browser** is used for most CRUD (profiles, listings, applications, messages) where RLS policies enforce authorization.

**Route Handlers** are used when operations require:
- Secret API keys (OpenAI, service role)
- Email sending or queued notification processing
- PDF generation, rate limiting, or multi-step orchestration

---

# 04 Project Structure

```
Intrenships_Platform-1/
├── frontend/                    # Deployable full-stack app
│   ├── app/                     # App Router pages + API routes
│   ├── components/              # UI and domain components
│   ├── lib/                     # Shared logic (supabase, ai, i18n, …)
│   ├── supabase/migrations/     # Canonical database schema
│   ├── middleware.ts            # Auth and role-based route gates
│   └── package.json
└── CONTEXT_ENG/                 # Product & engineering documentation
```

**Database source of truth:** `frontend/supabase/migrations/`  
Apply with `npm run supabase:push` from `frontend/`.

See also: `Project_structure.md` for detailed folder breakdown.

---

# 05 Development Stages

Stages below reflect the **MVP build plan**. Most core stages are **implemented**; later items (testing hardening, production ops) are ongoing.

---

## Stage 1 — Project Setup ✅

- Git repository and `frontend/` Next.js app
- Supabase project linked
- Environment variables (`.env.local`)
- Migrations pipeline under `frontend/supabase/migrations/`

---

## Stage 2 — Database Design ✅

- Core tables: profiles, students, companies, internship_positions, applications, notifications, …
- Extended tables: student_additional_info, training evaluations, DMs, email queue, report skills, …
- Row Level Security on all sensitive tables
- RPC functions for recommendations, company evaluation, supervisor summaries

---

## Stage 3 — Authentication System ✅

- Signup, login, email verification, auth callback
- Role-based profiles (student, company, supervisor, admin)
- Role upgrade flow (company/supervisor onboarding + admin approval)
- Middleware route protection by role

---

## Stage 4 — Internship Listings ✅

- Company dashboard and internship CRUD
- Active/inactive listings, applicant counts
- Admin oversight pages

---

## Stage 5 — Internship Discovery ✅

- Browse internships with search, filters, pagination
- AI recommendations (embeddings + skill insights)
- Company browse and public company profiles

---

## Stage 6 — Application System ✅

- Apply with optional message
- Company review, accept/reject, training schedule
- Commitment flow, status tracking, notifications
- Training completion and student evaluations

---

## Stage 7 — Supervisor Monitoring ✅

- Department-scoped student lists and detail views
- Internship reports workflow (monthly reports, attendance, evaluations)
- AI department insights

---

## Stage 8 — File Uploads ✅

- Student CV PDF upload (Storage + `cv_path`)
- Company logo upload
- Secure CV access for company reviewers via API route

---

## Stage 9 — Notification System ✅

- In-app notifications with typed links
- Email dispatch queue and SMTP/Resend integration
- User notification preferences

---

## Stage 10 — Admin Panel ✅ (partial analytics)

- User management, internship oversight, onboarding approvals
- Dashboard counts and recent activity
- Analytics page: still lightweight / placeholder in places

---

## Stage 11 — AI & Matching Enhancements ✅ (beyond original MVP)

- Student/internship embeddings and refresh
- CV builder with AI improve + persisted profile fields
- Cover letter generator, task-to-skill mapper
- Student assistant chat with platform context
- Company reputation tiers and dimension breakdown

---

## Stage 12 — Testing and Deployment 🔄

- Manual QA across roles
- Production deploy: **Next.js on Vercel** (or similar) + **Supabase** hosted project
- No separate backend service to deploy

---

# 06 Security Considerations

- **Row Level Security** on database tables — primary authorization for client-side Supabase access
- **Supabase Auth** JWT sessions; middleware validates role before protected routes
- **Service role key** only in server Route Handlers (`lib/supabase/admin.ts`), never exposed to browser
- **Rate limiting** on sensitive AI routes (chat, feedback analyze, resume improve)
- **Private storage** for CVs; signed or server-mediated access for companies

---

# 07 Deployment

| Component | Platform |
|-----------|----------|
| Next.js app (`frontend/`) | Vercel / Node hosting |
| Database, Auth, Storage | Supabase |
| OpenAI | OpenAI API |
| Email | SMTP (e.g. Gmail) or Resend |

Single-application deployment reduces ops overhead. Scale Supabase and Vercel independently as traffic grows.

---

# 08 Future Considerations

A **FastAPI** (or other) standalone backend is **not required** for the current architecture. Consider adding one only if you need:

- A shared REST API for native mobile clients
- Long-running workers isolated from Next.js serverless limits
- Python-only ML pipelines

Until then, extend `frontend/app/api/` and `frontend/lib/` rather than introducing a second server.

---

InternConnect Jordan · Implementation Document · v1.1 · May 2026  
Internal Engineering Document
