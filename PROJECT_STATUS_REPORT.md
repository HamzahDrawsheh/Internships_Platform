# InternConnect Jordan — Project Status Report

This document summarizes the current state of the repository: purpose, tech stack, what works, what is partial or missing, database usage, main flows, broken/placeholder pages, and a prioritized MVP roadmap. **No code was modified**; this is analysis only.

---

## 1. Overall Purpose of the Project

**InternConnect Jordan** is a web platform that connects **AI and Data Science students** in Jordanian universities with **companies** offering technical internships, and supports **university supervisors** who monitor student placements.

- **Students**: Discover internships, apply with one profile, track application status.
- **Companies**: Post internships, review applicants, accept/reject, see applicant counts.
- **Supervisors**: Monitor assigned students and their application/placement activity.
- **Admins**: User management, listing moderation, platform analytics (planned).

The product vision and feature set are defined in `CONTEXT_ENG/PRD.md`.

---

## 2. Technologies Used

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4 |
| **Backend** | **None** — no backend service in the repo. Documentation mentions FastAPI; it is not implemented. |
| **Database** | Supabase (PostgreSQL). The frontend talks to Supabase directly via the JS client. |
| **Auth** | Supabase Auth (email/password, JWT, session). No separate auth server. |
| **Storage** | Supabase Storage (planned for CVs/logos; not wired in the app yet). |

The application is **frontend + Supabase only**: no separate API server.

---

## 3. Current Implementation

### 3.1 Fully Implemented and Working

| Feature | Location | Notes |
|---------|----------|--------|
| **Landing page** | `(public)/page.tsx` | Public home, “How it works,” links to Sign up, Login, Browse. |
| **Login** | `auth/login/page.tsx` | Supabase `signInWithPassword`; redirects to `/dashboard`. |
| **Sign up** | `auth/signup/page.tsx` | Supabase `signUp` with optional `user_metadata` (full_name, role). |
| **Auth callback** | `auth/callback/route.ts` | Ensures profile exists, redirects by role or to onboarding. |
| **Onboarding** | `onboarding/page.tsx` | Role selection + full name; insert/update `profiles` in Supabase. |
| **Route protection** | `middleware.ts` | Auth + role-based redirects; unauthenticated → login; wrong role → role home. |
| **Dashboard redirect** | `dashboard/page.tsx` | Reads `profiles.role`, redirects to role dashboard or onboarding. |
| **Company: list internships** | `company/internships/page.tsx` + `CompanyInternshipsList.tsx` | Fetches `internships` by `company_id`, applicant counts from `applications`. |
| **Company: dashboard** | `dashboard/company/page.tsx` + `CompanyDashboardContent.tsx` | Counts internships and applications; recent applicants with joins to `internships` and `profiles`. |
| **Student: my applications** | `applications/page.tsx` + `ApplicationsList.tsx` | Fetches `applications` for current user with internship title and company name (join). |
| **Student: dashboard** | `dashboard/student/page.tsx` + `StudentDashboardContent.tsx` | Same application data; shows totals (total, under review, accepted) and recent 5. |
| **Logout** | `components/auth/logout-button.tsx` | Supabase sign out. |
| **Profile helpers** | `lib/auth.ts` | `ensureProfile`, `getProfile`, `getDashboardPath`, `getCurrentUserRole`; read/update `profiles`. |

These features use Supabase (auth and/or tables) and behave as intended for the current schema.

### 3.2 Partially Implemented

| Feature | What works | What’s missing |
|---------|------------|----------------|
| **Browse internships** | `/internships` — filters UI (search, location, skill, deadline). | **No Supabase query.** Page always shows “No internships available yet” / “Connect the app to Supabase…”. Filters do not load or filter real data. |
| **Internship detail** | `/internships/[id]` — layout, Apply button, cover letter modal. | **Hardcoded placeholder data** (title, company, description, etc.). No fetch by `id`. **Apply** does not insert into `applications`; modal only closes. |
| **Create internship** | `/company/internships/new` — full form (title, description, location, skills, dates, positions). | **No Supabase insert.** Publish / Save as draft only redirect to `/company/internships`; nothing is saved. |
| **Edit internship** | `/company/internships/[id]/edit` — same form as create. | **No load by id, no Supabase update.** Update / Save as draft only redirect; no persistence. |
| **Company: applicants list** | `/company/internships/[id]/applications` — layout, table headers, “Back,” modal for notes. | **Empty list** (`applicants: unknown[] = []`). No fetch of `applications` for this `internship_id`. No status update (accept/reject) or notes persistence. |
| **Student profile** | `/profile/student` — form (name, university, major, year, skills, bio) and CV upload input. | **No Supabase.** Form state is local; “Save” only sets local “Changes saved.” No profiles extension table or Storage for CV. |
| **Company profile** | `/profile/company` — form (name, industry, website, description) and logo upload input. | **No Supabase.** Same as student: local state only; logo upload is no-op. |

So: UI and navigation exist for these flows, but the critical read/write to Supabase (and, where relevant, Storage) is missing.

### 3.3 Missing (Not Implemented)

| Feature | Notes |
|---------|--------|
| **Backend API** | No `backend/` folder; no FastAPI or other server. All logic is frontend + Supabase. |
| **Supervisor: assigned students** | No table or relation for “supervisor ↔ students.” Supervisor dashboard and students list are placeholders. |
| **Supervisor: student detail & reports** | `/supervisor/students/[id]` and `/supervisor/reports` — static copy; “Connect to the backend.” No data or CSV export. |
| **Admin: user management** | `/admin/users` — no list from `profiles`, no suspend/unsuspend. |
| **Admin: internship moderation** | `/admin/internships` — no pending listings, no approve/reject. |
| **Admin: analytics** | `/admin/dashboard`, `/admin/analytics` — no real metrics. |
| **Notifications** | `/notifications` — empty list; no `notifications` table or real-time/API. |
| **File uploads** | No CV (student) or logo (company) upload to Supabase Storage. |
| **Forgot password** | Login page has a “Forgot password?” link with no target. |
| **Bookmark internships** | Detail page has a “Bookmark” button with no behavior. |

---

## 4. Database Usage

### 4.1 Tables That Exist (Schema)

Defined in `CONTEXT_ENG/supabase-schema-complete.sql` (and partially in `CONTEXT_ENG/supabase-schema.sql`):

| Table | Purpose |
|-------|--------|
| **profiles** | One row per auth user: `id` (FK to `auth.users`), `email`, `full_name`, `role`, `is_suspended`, `created_at`, `updated_at`. |
| **internships** | Company postings: `company_id` → profiles, `title`, `description`, `location_type`, `skills[]`, `duration_weeks`, `start_date`, `deadline`, `open_positions`, `status`, timestamps. |
| **applications** | Student applications: `internship_id`, `student_id`, `status`, `cover_letter`, `created_at`; UNIQUE(internship_id, student_id). |

There is **no** `notifications` table and **no** supervisor–student assignment table in the current schema.

### 4.2 Pages That Interact with the Database

| Page / module | Tables used | Operations |
|---------------|-------------|-------------|
| **middleware** | `profiles` | SELECT `role` for route protection. |
| **auth/callback** | (auth only) | Uses `ensureProfile()` which reads/inserts/updates `profiles`. |
| **dashboard/page** | `profiles` | SELECT `role` for redirect. |
| **lib/auth** | `profiles` | SELECT, INSERT, UPDATE (ensureProfile, getProfile). |
| **onboarding** | `profiles` | INSERT or UPDATE (role, full_name, email). |
| **auth/login, signup** | Supabase Auth only | No direct table access (profile created via callback/onboarding). |
| **Company: list** | `internships`, `applications` | SELECT internships by company_id; count applications per internship. |
| **Company: dashboard** | `internships`, `applications`, `profiles` | Count internships/applications; recent applicants with joins. |
| **Student: applications** | `applications`, `internships`, `profiles` | SELECT applications with internship title and company full_name. |
| **Student: dashboard** | Same as above | Same query; different presentation. |

### 4.3 Features Not Connected to Supabase

- **Browse internships** (`/internships`) — does not query `internships`.
- **Internship detail** (`/internships/[id]`) — does not fetch row by id; Apply does not insert into `applications`.
- **Create internship** (`/company/internships/new`) — does not insert into `internships`.
- **Edit internship** (`/company/internships/[id]/edit`) — does not load or update `internships`.
- **Company applicants** (`/company/internships/[id]/applications`) — does not fetch `applications` for that internship or update status.
- **Student profile** — no read/write of profile extension or CV (no table/Storage).
- **Company profile** — no read/write of company profile or logo (no table/Storage).
- **Notifications** — no table or subscription.
- **Supervisor / Admin** — no queries; no assignment or moderation data.

---

## 5. Main Application Flows

### 5.1 Student Flow

| Step | Status | Notes |
|------|--------|--------|
| Sign up → verify email | ✅ | Supabase Auth. |
| Login → onboarding (role + name) | ✅ | Profile in DB. |
| Dashboard | ✅ | Shows application counts and recent applications from Supabase. |
| Browse internships | ❌ | UI only; no data from DB. |
| View internship detail | ❌ | Placeholder data only. |
| Apply (submit application) | ❌ | Modal only; no insert into `applications`. |
| My applications | ✅ | List from Supabase with status, title, company. |
| Profile (student) | ⚠️ | Form only; not persisted. |

**Conclusion:** Student can register, log in, complete onboarding, and see their applications. They **cannot** yet discover real internships, open a real detail page, or submit an application.

### 5.2 Company Flow

| Step | Status | Notes |
|------|--------|--------|
| Sign up → onboarding | ✅ | Same as student. |
| Dashboard | ✅ | Counts and recent applicants from Supabase. |
| List my internships | ✅ | From `internships` with applicant counts. |
| Create internship | ❌ | Form only; no insert. |
| Edit internship | ❌ | No load or update. |
| View applicants for a listing | ❌ | Page exists but no data fetch. |
| Accept / Reject application | ❌ | Not implemented. |
| Company profile | ⚠️ | Form only; not persisted. |

**Conclusion:** Company can register, see dashboard and internship list. They **cannot** create or edit listings, see applicants per listing, or change application status.

### 5.3 Supervisor / Admin Flow

| Step | Status | Notes |
|------|--------|--------|
| Supervisor dashboard | ⚠️ | Static cards (e.g. 0 students); no DB. |
| Students list | ⚠️ | Empty; no “assigned students” relation. |
| Student detail | ⚠️ | Placeholder text. |
| Reports / CSV export | ⚠️ | Button only; no logic. |
| Admin dashboard | ⚠️ | Placeholder metrics. |
| Admin: users | ⚠️ | Empty; no user list or suspend. |
| Admin: internship moderation | ⚠️ | Empty; no pending list or approve/reject. |
| Admin: analytics | ⚠️ | Placeholder; no metrics. |

**Conclusion:** All supervisor and admin pages are **placeholders**; no backend or Supabase usage for these roles.

---

## 6. Broken or Placeholder Pages

### 6.1 Placeholder (UI only, no real data or action)

- **`/internships`** — Browse; always “No internships available yet”; filters not connected.
- **`/internships/[id]`** — Detail; hardcoded copy; Apply does not create application.
- **`/company/internships/new`** — Create; form does not save.
- **`/company/internships/[id]/edit`** — Edit; does not load or save.
- **`/company/internships/[id]/applications`** — Applicants; empty list; no fetch or status update.
- **`/profile/student`** — Form and CV input; nothing persisted.
- **`/profile/company`** — Form and logo input; nothing persisted.
- **`/notifications`** — Empty list; no notifications feature.
- **`/dashboard/supervisor`** — Static “0” and “connect backend” copy.
- **`/supervisor/students`** — Empty list.
- **`/supervisor/students/[id]`** — “Details will load from the backend.”
- **`/supervisor/reports`** — “Export CSV” with no implementation.
- **`/admin/dashboard`** — Placeholder cards (e.g. “—”) and empty state.
- **`/admin/users`** — “No user data yet.”
- **`/admin/internships`** — “No pending internships.”
- **`/admin/analytics`** — “Connect backend to load data.”

### 6.2 Incomplete but Partially Working

- **`/applications`** — Works if applications exist (e.g. created via SQL or future Apply flow). No way in the app yet to create an application.
- **`/dashboard/company`** — Works for counts and recent applicants once internships and applications exist; company cannot yet create internships or manage applications from the UI.

### 6.3 Not Broken (working as implemented)

- Landing, login, signup, auth callback, onboarding, dashboard redirect, company internship list, company dashboard, student applications list, student dashboard, logout, middleware, auth helpers.

### 6.4 Minor / UX

- **Login** — “Forgot password?” link has `href="#"`; no reset flow.
- **Internship detail** — “Bookmark” button has no behavior.

---

## 7. Prioritized Roadmap to a Working MVP

MVP is defined as: **students can browse internships, apply, and see status; companies can create internships, see applicants, and accept/reject.**

### Phase 1 — Core data flow (highest priority)

1. **Browse internships**
   - On `/internships`, query Supabase `internships` where `status = 'active'`.
   - Apply existing filters (location, skill, deadline, search) in the query.
   - Render list (e.g. cards) with link to `/internships/[id]`.

2. **Internship detail + Apply**
   - On `/internships/[id]`, fetch internship by id (and company name from `profiles`).
   - Render real data; “Apply” inserts into `applications` (current user as `student_id`, optional `cover_letter`).
   - Handle duplicate application (UNIQUE constraint) and show success/error.

3. **Create internship**
   - On `/company/internships/new`, on submit insert into `internships` (`company_id` = current user, map form fields including `skills` array and `status` = draft or active).

4. **Edit internship**
   - Load internship by id (and verify `company_id` = current user); populate form.
   - On submit, update the row in `internships`.

5. **Company: applicants page**
   - On `/company/internships/[id]/applications`, fetch `applications` for that `internship_id` (with student names from `profiles`).
   - Add actions to update `applications.status` (e.g. under_review, accepted, rejected).

After Phase 1, the main student and company loops work end-to-end with the existing schema.

### Phase 2 — Profiles and polish

6. **Student profile**
   - Either extend `profiles` or add a `student_profiles` table (university, major, year, skills, bio). Load/save from `/profile/student`. Optionally add CV upload to Supabase Storage later.

7. **Company profile**
   - Same idea: extend `profiles` or add `company_profiles` (company name, industry, website, description). Load/save from `/profile/company`. Optionally add logo to Storage later.

8. **Forgot password**
   - Use Supabase `resetPasswordForEmail` and a simple “email sent” / reset-password page.

9. **Small fixes**
   - Remove or implement Bookmark; ensure login redirect and error states are clear.

### Phase 3 — Supervisor (if in MVP scope)

10. **Supervisor–student relationship**
    - Add table (e.g. `supervisor_students(supervisor_id, student_id)`) and RLS.
    - UI for admin or supervisor to assign students; supervisor dashboard and students list read from this + `applications` / `internships`.

11. **Supervisor reports**
    - CSV export of assigned students and their application/placement status (query `applications` + `internships` + `profiles`).

### Phase 4 — Admin (if in MVP scope)

12. **User list and suspend**
    - Admin reads `profiles` (and optionally `is_suspended`); add “Suspend”/“Unsuspend” that updates `profiles`.

13. **Listing moderation**
    - If listings require approval: add e.g. `status = 'pending'`, admin page to list pending and set to active/rejected.

14. **Analytics**
    - Simple counts and lists from `profiles`, `internships`, `applications` for admin dashboard/analytics page.

### Phase 5 — Later (post-MVP)

- Notifications table and UI.
- File uploads (CV, logo) with Supabase Storage.
- Email notifications on application status change (e.g. Supabase Edge Functions or external service).

---

## Summary Table

| Area | Working | Partial | Missing |
|------|---------|---------|---------|
| **Auth & onboarding** | Login, signup, callback, onboarding, middleware | — | Forgot password |
| **Student** | Dashboard, my applications | Browse (UI), detail (UI), Apply (UI) | Real browse/detail/apply, profile persistence |
| **Company** | Dashboard, list internships | Create/Edit/Applicants (UI only) | Persist create/edit, load applicants, accept/reject |
| **Supervisor** | — | All pages (shell only) | Assignment model, data, reports |
| **Admin** | — | All pages (shell only) | User list, moderation, analytics |
| **Database** | profiles, internships, applications (schema + RLS) | — | notifications, supervisor_students (if needed) |

**Recommended next step:** Implement **Phase 1** (browse, detail+apply, create internship, edit internship, company applicants + status update) so the app delivers a working MVP with no new tables, using the existing Supabase schema and frontend structure.
