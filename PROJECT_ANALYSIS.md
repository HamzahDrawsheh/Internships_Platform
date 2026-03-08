# InternConnect Jordan — Project Analysis

This document summarizes the current state of the repository, technologies, what’s implemented, what’s missing, and how to run the project locally.

---

## 1. Main purpose of the project

**InternConnect Jordan** is a web platform that connects **AI and Data Science students** in Jordan with **companies** offering internships, and supports **university supervisors** who monitor student placements.

- **Students**: Discover internships, apply with one profile, track application status.
- **Companies**: Post internships, review applicants, accept/reject, view applicant counts.
- **Supervisors**: Monitor assigned students and their application/placement activity.
- **Admins**: User management, listing moderation, platform analytics (planned).

The product vision and features are described in `CONTEXT_ENG/PRD.md`.

---

## 2. Technologies and frameworks

| Layer        | Technology |
|-------------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| **Backend**  | **None in repo** — docs mention FastAPI, but no backend code exists. |
| **Database** | Supabase (PostgreSQL) — used directly from the frontend. |
| **Auth**     | Supabase Auth (email/password, JWT, session). |
| **Storage**  | Supabase Storage (planned for CVs/logos; not wired in UI yet). |

The app is currently **frontend + Supabase only**: no separate API server. The README and `CONTEXT_ENG/Implementation.md` describe a future FastAPI backend that is not implemented.

---

## 3. What is already implemented

### Authentication and onboarding
- **Login** (`/auth/login`) — Supabase `signInWithPassword`.
- **Sign up** (`/auth/signup`) — Supabase signup with optional `user_metadata` (e.g. role, full_name).
- **Auth callback** (`/auth/callback`) — Post-login: ensure profile, redirect by role or to onboarding.
- **Onboarding** (`/onboarding`) — Role selection (Student / Company / Supervisor), full name, insert/update `profiles` in Supabase.
- **Middleware** — Protects routes by auth and role; redirects unauthenticated users to login and wrong-role users to their dashboard.
- **Logout** — Logout button in Navbar (wired to Supabase).

### Profiles
- **Profiles table** — Used in app and in migrations; RLS policies for own-profile read/insert/update.
- **Role-based redirects** — Dashboard route (`/dashboard`) redirects to `/dashboard/student`, `/dashboard/company`, `/dashboard/supervisor`, or `/admin/dashboard` by `profiles.role`.
- **Profile helpers** — `lib/auth.ts`: `ensureProfile()`, `getProfile()`, `getDashboardPath()`, `getCurrentUserRole()`.

### Company – internships
- **Company dashboard** (`/dashboard/company`) — Renders `CompanyInternshipsList`.
- **List company internships** (`/company/internships`) — Fetches from Supabase `internships` for current user, with applicant counts.
- **Create internship page** (`/company/internships/new`) — Form UI only; **does not persist to Supabase** (only redirects).
- **Edit internship page** (`/company/internships/[id]/edit`) — Exists; needs verification if it saves to Supabase.
- **Applicants list** (`/company/internships/[id]/applications`) — Page exists for viewing applicants.

### Student – applications
- **My applications** (`/applications`) — Fetches from Supabase `applications` for current user with internship title and company (via join to `internships` and `profiles`).
- **Application table and status badge** — UI components for listing and status.

### General UI and structure
- **Landing** (`/`) — Public landing with “How it works” and links to Sign up, Login, Browse Internships.
- **Layout** — Root layout with Navbar; public layout under `(public)`.
- **Shared components** — Button, Input, Select, Modal, Card, Badge, EmptyState, Table, PageHeader, Container, etc. under `components/ui` and `components/common`.
- **Internship filters** — Component exists; used on browse page but browse does not yet load data from Supabase.

### Admin and supervisor (UI only)
- **Admin dashboard** (`/admin/dashboard`) — Placeholder cards and empty state; no real data.
- **Admin users / internships / analytics** — Pages exist; placeholders.
- **Supervisor dashboard** (`/dashboard/supervisor`) — Placeholder cards and empty state.
- **Supervisor students list** (`/supervisor/students`), **student detail** (`/supervisor/students/[id]`), **reports** (`/supervisor/reports`) — Pages exist; not wired to data.

### Notifications
- **Notifications page** (`/notifications`) — Exists; not wired to a notifications table or Supabase.

### Database and schema
- **Schema docs** — `CONTEXT_ENG/supabase-schema.sql`: profiles, internships, applications with RLS.
- **Migrations** — `frontend/supabase/migrations/001_profiles.sql` and `frontend/supabase/profiles-table.sql` (see schema mismatch below).

---

## 4. What is incomplete or missing

### Backend
- **No FastAPI (or any) backend** — The `backend/` folder and all API code are missing. Docs describe FastAPI; the app does not use it. All data access is via Supabase from the frontend.

### Browse and apply flow
- **Browse internships** (`/internships`) — Filters UI only; **does not load from Supabase**; shows “No internships available yet” and “Connect the app to Supabase or FastAPI to load internship listings.”
- **Internship detail** (`/internships/[id]`) — **Hardcoded placeholder** (“Internship Title”, “Company Name”, etc.); no fetch by `id`, no real data.
- **Apply** — Apply button opens modal but **does not create a row in `applications`**; “Submit application” only closes the modal.

### Company – create/edit internship
- **Create internship** (`/company/internships/new`) — Form does **not** call Supabase; Publish/Save draft only redirect to `/company/internships`.
- **Edit internship** — Needs confirmation that it updates Supabase; if it only reads, then update logic is missing.

### Profiles schema mismatch
- **Two profile schemas**:
  - `frontend/supabase/migrations/001_profiles.sql`: `role` as **enum** `public.role`, **no** `updated_at`, has `is_suspended`.
  - `frontend/supabase/profiles-table.sql` and `CONTEXT_ENG/supabase-schema.sql`: `role` as **text** with check constraint, **has** `updated_at`.
- **`lib/auth.ts`** uses `updated_at` in profile updates. If you run only `001_profiles.sql`, those updates will **fail** (column missing). Use one consistent schema (e.g. the one in `CONTEXT_ENG/supabase-schema.sql` or `profiles-table.sql`) and ensure migrations match.

### Supervisor and admin
- **Supervisor** — No “assigned students” relation or tables in the provided schema; no backend; dashboards and lists are placeholders.
- **Admin** — No admin-only RLS or endpoints; admin pages are placeholders. User management, listing moderation, and analytics are not implemented.

### Notifications and file uploads
- **Notifications** — No `notifications` table or real-time/API integration; page is placeholder.
- **File uploads** — No CV upload (student) or logo upload (company) in the UI; Supabase Storage not wired.

### Configuration
- **No `.env` or `.env.example` in repo** — Frontend expects `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without these, the app will throw in Supabase client creation and in middleware.

### Other
- **Forgot password** — Link on login page has no target.
- **Bug tracking** — `CONTEXT_ENG/Bug_tracking.md` lists open bugs (e.g. login, filters, duplicate applications, CV upload); some may be outdated given current implementation.

---

## 5. Project structure and important folders

```
Intrenships_Platform/
├── frontend/                    # Next.js app (only runnable part)
│   ├── app/
│   │   ├── (public)/            # Landing and public layout
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx         # Landing
│   │   ├── auth/                # Login, signup, verify, callback
│   │   ├── dashboard/           # Role-specific dashboards + redirect
│   │   ├── internships/        # Browse (no data) + [id] detail (placeholder)
│   │   ├── applications/       # My applications (wired to Supabase)
│   │   ├── company/internships/ # List, new, [id]/edit, [id]/applications
│   │   ├── supervisor/         # Students, [id], reports (placeholders)
│   │   ├── admin/              # Dashboard, users, internships, analytics (placeholders)
│   │   ├── profile/            # Student and company profile pages
│   │   ├── onboarding/
│   │   └── notifications/
│   ├── components/
│   │   ├── layout/              # Navbar, Container, PageHeader
│   │   ├── ui/                  # Button, Input, Select, Modal, Card, Badge, etc.
│   │   ├── common/              # Table, EmptyState, etc.
│   │   ├── auth/                # LogoutButton
│   │   ├── internships/        # InternshipCard, InternshipFilters, InternshipForm
│   │   └── applications/       # ApplicationTable, ApplicationStatusBadge
│   ├── lib/
│   │   ├── supabase/            # client.ts (browser), server.ts (SSR)
│   │   ├── auth.ts              # ensureProfile, getProfile, getDashboardPath
│   │   └── types.ts             # Domain types (Internship, Application, roles, etc.)
│   ├── middleware.ts            # Auth + role-based route protection
│   ├── supabase/
│   │   ├── migrations/          # 001_profiles.sql
│   │   └── profiles-table.sql   # Alternative profiles schema
│   ├── public/
│   ├── next.config.ts
│   ├── package.json
│   └── .env.local               # YOU CREATE: Supabase URL + anon key
│
├── CONTEXT_ENG/                 # Product and technical docs
│   ├── PRD.md
│   ├── Implementation.md
│   ├── Project_structure.md
│   ├── UI_UX_doc.md
│   ├── Bug_tracking.md
│   └── supabase-schema.sql      # Full schema (profiles, internships, applications)
│
├── Project Diagrams/           # README only
├── README.md                    # Project overview and run commands
└── PROJECT_ANALYSIS.md         # This file
```

There is **no `backend/`** directory in the repository.

---

## 6. Main entry points

| Entry point        | File(s)              | Purpose |
|--------------------|----------------------|--------|
| **Frontend app**   | `frontend/app/layout.tsx` | Root layout (Navbar + children). |
| **Frontend dev**   | `frontend/package.json` → `npm run dev` | Starts Next.js dev server (e.g. port 3000). |
| **Landing**        | `frontend/app/(public)/page.tsx` | Public home page. |
| **Auth callback**  | `frontend/app/auth/callback/route.ts` | Post-login redirect and profile ensure. |
| **Dashboard redirect** | `frontend/app/dashboard/page.tsx` | Redirects to role-specific dashboard or onboarding. |
| **Middleware**     | `frontend/middleware.ts` | Runs on every request: auth check and role-based redirect. |

There is no server entry point for a backend (no `main.py`, no `server.js`, etc.).

---

## 7. How to install and run locally (step-by-step)

### Prerequisites
- **Node.js** (v18+ recommended for Next.js 16)
- **npm** (or yarn/pnpm)
- A **Supabase project** (free tier is enough)

### Step 1: Clone and go to frontend
```powershell
cd "C:\Users\علي عثمان\OneDrive\Desktop\graduation_project_in_curser\Intrenships_Platform"
cd frontend
```

### Step 2: Install dependencies
```powershell
npm install
```

### Step 3: Configure environment variables
Create `frontend/.env.local` with your Supabase project URL and anon key:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Get both from: [Supabase Dashboard](https://app.supabase.com) → your project → **Settings** → **API** (Project URL and `anon` public key).

### Step 4: Apply database schema in Supabase
In Supabase: **SQL Editor** → New query. Run the schema that matches what the app expects:

- Prefer **one** of these (to avoid `updated_at` vs enum issues):
  - **Option A**: Use `CONTEXT_ENG/supabase-schema.sql` (profiles with `updated_at`, text `role`, plus internships and applications with RLS).
  - **Option B**: Use `frontend/supabase/profiles-table.sql` for profiles only, then add internships and applications from `CONTEXT_ENG/supabase-schema.sql`.

Do **not** mix `001_profiles.sql` (enum role, no `updated_at`) with `lib/auth.ts` unless you add `updated_at` and align role type.

### Step 5: Run the frontend
```powershell
npm run dev
```

Then open: **http://localhost:3000**

---

## 8. Running multiple services

- **Frontend**: Only service that exists. Run as above (`npm run dev` in `frontend/`).
- **Backend**: Not present. The README’s “Backend” section (`cd backend`, `pip install -r requirements.txt`, `uvicorn app.main:app --reload`) cannot be run because there is no `backend/` code. Ignore it until a backend is added.

---

## 9. Configuration files needed

| File / config        | Purpose |
|----------------------|--------|
| **`frontend/.env.local`** | **Required.** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Without these, the app throws when creating the Supabase client or in middleware. |
| **Supabase project** | Create at supabase.com; enable Email auth (and optionally email confirm). |
| **Database**         | Run the chosen SQL schema (e.g. `CONTEXT_ENG/supabase-schema.sql`) in the Supabase SQL Editor. |
| **`frontend/next.config.ts`** | Default Next.js config; no extra env or API base URL. |

There is no `.env.example` in the repo; one is added in `frontend/.env.example` for reference.

---

## 10. What is broken or missing to run it

### Must fix to run
1. **Create `frontend/.env.local`** with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Otherwise the app will throw on load or on protected routes.
2. **Apply a consistent Supabase schema** (e.g. `CONTEXT_ENG/supabase-schema.sql`). If you only ran `001_profiles.sql`, add `updated_at` to `profiles` or stop using it in `lib/auth.ts`; otherwise profile updates after login may fail.

### To get full MVP behavior (after “run” works)
3. **Browse internships** — On `/internships`, query Supabase `internships` (e.g. `status = 'active'`) with your existing filters and render the list (and link to detail).
4. **Internship detail** — On `/internships/[id]`, fetch the internship (and company name from `profiles`) by `id` and render; wire **Apply** to insert into `applications` (student_id from session, internship_id from route).
5. **Create internship** — On `/company/internships/new`, on submit insert into `internships` (company_id = current user id, status = `draft` or `active`) instead of only redirecting.
6. **Edit internship** — Ensure `/company/internships/[id]/edit` loads one row by id and updates it in Supabase.
7. **ApplicationsList join** — The select uses `company:profiles!company_id(full_name)`. Ensure your `internships` table has `company_id` → `profiles.id` and that RLS allows the join; fix relation name if your schema uses a different FK name.
8. **Supervisor / Admin** — Require schema and RLS for “assigned students” and admin capabilities, plus backend or Supabase functions if you need server-side logic.

### Optional
- Add **Forgot password** flow (Supabase `resetPasswordForEmail`).
- Add **notifications** table and wire the notifications page.
- Add **CV/logo** upload to Supabase Storage and link to profiles/internships.

---

## Quick command reference

```powershell
# From repo root
cd "C:\Users\علي عثمان\OneDrive\Desktop\graduation_project_in_curser\Intrenships_Platform\frontend"

# Install
npm install

# Run (after .env.local is set and Supabase schema is applied)
npm run dev
```

Then open **http://localhost:3000**. Sign up, complete onboarding, then use Company dashboard to create internships (once create is wired) and Student flow to browse and apply (once browse/detail/apply are wired).
