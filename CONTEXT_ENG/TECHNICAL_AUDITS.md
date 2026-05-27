# InternConnect Jordan Technical Audits

This document consolidates the repository audits for:

- AI recommendations and AI features
- Frontend architecture and user flows
- Authentication, authorization, API routes, and server logic
- Supabase database, RLS, storage, RPCs, and migrations

Repository audited: `Intrenships_Platform-1`  
Primary app: `frontend/`

---

## 1. Executive Abstract

InternConnect Jordan / AI Intern Jordan is a full-stack Next.js and Supabase SaaS platform for connecting students with internship providers, while supervisors and admins monitor the training lifecycle.

The platform is not frontend-only. It is a Next.js App Router application where UI, route handlers, and server-side integrations live in `frontend/`. Supabase provides authentication, Postgres, RLS, storage, database functions, and workflow automation. OpenAI powers recommendations, student assistant features, CV improvement, cover-letter generation, feedback analysis, and report-to-skill extraction.

Overall, the repository is feature-rich and close to an advanced MVP or controlled beta. The strongest areas are product coverage, role-based workflow depth, Supabase RLS usage, internship lifecycle logic, and practical AI integrations. The weakest areas are production hardening, public diagnostics, in-memory rate limiting, background job reliability, vector-search scalability, duplicate UI/schema remnants, and limited automated authorization testing.

Production readiness estimate: **70-75%**.

---

## 2. Project Stack And Architecture

### Stack

- Next.js `16.1.6`
- React `19`
- TypeScript
- Tailwind CSS `4`
- Supabase Auth
- Supabase Postgres with RLS
- Supabase Storage
- OpenAI SDK
- Nodemailer / SMTP
- Resend fallback
- jsPDF
- next-themes

### Architecture Pattern

The app is a **full-stack serverless Next.js monolith** backed by Supabase.

Key characteristics:

- Browser pages often query Supabase directly using the anon key and RLS.
- Sensitive operations use Next.js route handlers under `frontend/app/api/`.
- Supabase migrations define schema, RLS policies, triggers, RPCs, storage buckets, and workflow automation.
- OpenAI calls are server-side only.
- There is no separate Python/FastAPI/backend service.
- There are no server actions; server logic is route-handler based.

### Main Runtime Components

| Layer | Implementation | Purpose |
|---|---|---|
| UI | `frontend/app`, `frontend/components` | Role-specific pages, dashboards, forms, messaging, reports |
| Middleware | `frontend/middleware.ts` | Session checks, role gates, onboarding redirects, suspension handling |
| API routes | `frontend/app/api/**/route.ts` | AI, recommendations, email, notifications, storage signing, applications |
| Supabase Auth | Supabase managed auth | Email/password sessions and user identity |
| Database | `frontend/supabase/migrations` | Business model, policies, triggers, RPCs |
| Storage | Supabase buckets | CVs, logos, report PDFs |
| AI | OpenAI | Embeddings, assistant, CV/cover-letter generation, feedback analysis |
| Email | SMTP / Resend | Welcome emails and transactional notifications |

---

## 3. Product And Users

### Product Purpose

The product connects AI/data/computing students in Jordan with companies offering internships. It also supports university supervisors and admins who monitor onboarding, reports, approvals, and platform operations.

### User Roles

| Role | Main Home | Purpose |
|---|---|---|
| Student | `/dashboard/student` | Browse internships, apply, receive AI recommendations, manage CV, submit reports |
| Company | `/dashboard/company` | Post internships, review applicants, manage trainees, submit evaluations |
| Supervisor | `/dashboard/supervisor` | Monitor same-department students, review reports, approve workflows |
| Admin | `/admin/dashboard` | Manage users, approvals, internships, analytics, platform moderation |

---

## 4. AI Recommendations And AI Features Audit

### AI Features Implemented

| Feature | Location | Description |
|---|---|---|
| Student embeddings | `lib/ai/embeddings.ts` | Builds student profile text and stores `students.embedding` |
| Internship embeddings | `lib/ai/embeddings.ts` | Builds listing text and stores `internship_positions.embedding` |
| Internship recommendations | `app/api/recommendations/internships/route.ts` | Scores active listings for a student |
| Single internship match | `app/api/recommendations/internships/[internshipId]/route.ts` | Returns one position match |
| Student assistant | `app/api/chat/student-assistant/route.ts` | Context-heavy chatbot for student platform help |
| Resume improvement | `app/api/resume/improve/route.ts` | ATS-focused CV rewriting |
| Cover letter generation | `app/api/ai/cover-letter/route.ts` | Generates cover letters from profile and listing context |
| Feedback analysis | `app/api/feedback/analyze/route.ts` | Converts training feedback into sentiment and dimension scores |
| Report-to-skill extraction | `app/api/ai/task-to-skill/route.ts` | Extracts evidence-based skills from monthly reports |
| Company AI summary | `get_company_feedback_ai_summary` RPC | Aggregates stored AI feedback analysis |
| Supervisor AI summary | `get_supervisor_department_ai_summary` RPC | Aggregates department-level AI feedback insights |

### Models And Environment

| Variable | Default / Use |
|---|---|
| `OPENAI_API_KEY` | Required for all AI features |
| `OPENAI_CHAT_MODEL` | Defaults to `gpt-4o-mini` for assistant |
| `OPENAI_COVER_LETTER_MODEL` | Falls back to chat model |
| `OPENAI_RESUME_MODEL` | Defaults to `gpt-4o-mini` |
| `OPENAI_FEEDBACK_MODEL` | Defaults to `gpt-4o-mini` |
| `OPENAI_TASK_TO_SKILL_MODEL` | Falls back to chat model |

Embeddings use `text-embedding-3-small`, matching `vector(1536)` columns in Supabase.

### Recommendation Scoring

The recommendation system is hybrid:

1. Generate embeddings for students and internships.
2. Parse vectors from Postgres.
3. Compute cosine similarity in application code.
4. Apply location and work-type filtering.
5. Run deterministic skill-gap analysis.
6. Blend semantic score with company quality score.
7. Sort by final recommendation score.

Company reputation affects ranking:

- `white`: boost
- `gray`: neutral
- `black`: penalty
- new/unevaluated company: no adjustment

Skill-gap analysis is deterministic, not LLM-based. It uses known skill names, synonyms, and token matching.

### AI Strengths

- OpenAI keys stay server-side.
- Embedding text intentionally excludes unnecessary PII such as name/email.
- AI output is usually parsed and validated as JSON.
- CV and cover-letter prompts instruct the model not to invent experience.
- Task-to-skill extraction requires evidence text and confidence scores.
- Feedback analysis persists structured results instead of relying only on live generation.

### AI Weaknesses

- No pgvector index; recommendations will slow as data grows.
- Matching loads active positions and scores them in Node.
- Bulk embedding generation is sequential.
- AI rate limiting is in-memory and not production-scale.
- Student assistant can build very large context payloads.
- Prompt-injection risk remains because user/profile/report content enters prompts.
- Adding extracted skills to CV does not clearly trigger embedding refresh.

### AI Improvements

- Add pgvector HNSW/IVFFlat indexes or optimized vector RPC.
- Cache recommendation results per student.
- Move AI rate limits to Redis/Upstash/Supabase-backed counters.
- Batch embedding generation.
- Add background jobs for embedding refresh.
- Add prompt-injection hardening and stricter context boundaries.
- Add cost monitoring for OpenAI routes.

---

## 5. Frontend Architecture And Flows Audit

### Frontend Structure

| Area | Path | Purpose |
|---|---|---|
| App Router | `frontend/app` | Pages, layouts, route handlers |
| Components | `frontend/components` | UI, dashboards, reports, messaging, profiles |
| Lib/services | `frontend/lib` | Supabase, auth, AI, CV, notifications, i18n, reports |
| Context | `frontend/context` | Messaging drawer context |
| Hooks | `frontend/hooks` | Messaging helpers |
| Styles | `frontend/app/globals.css` | Tailwind, tokens, dark mode, RTL, animations |

### Rendering Model

Most feature pages are client components using `"use client"` and direct Supabase browser queries. The landing page and a few redirect pages are server components.

There is no global data-fetching framework such as React Query, Redux, or Zustand. State is mostly local React state, React context, localStorage, and custom browser events.

### Shell And Navigation

The app uses:

- Global `Navbar`
- `AppProviders`
- Role-specific sidebars
- `RoleShell`
- Collapsible sidebar stored in localStorage
- Global message drawer

Layouts include student, company, supervisor, admin, profile, applications, companies, internships, and resume-builder shells.

### Major Student Flows

1. Sign up / log in.
2. Complete profile and CV.
3. Browse internships.
4. View recommendations and match breakdowns.
5. Apply to internship.
6. Track application status.
7. Confirm accepted offer commitment.
8. Complete monthly reports.
9. Upload final report.
10. Submit training evaluation.
11. Use assistant, CV builder, cover-letter generator, and AI skill extraction.
12. Receive notifications and messages.

### Major Company Flows

1. Sign up with company intent.
2. Submit onboarding request.
3. Wait for admin approval.
4. Create company profile.
5. Create and manage internship listings.
6. Review applicants.
7. Access applicant CV through signed URL.
8. Accept/reject applications.
9. Manage trainee attendance, reports, and evaluations.
10. Receive notifications and messages.

### Major Supervisor Flows

1. Sign up with supervisor intent.
2. Submit onboarding request.
3. Wait for admin approval.
4. View same-department students.
5. Review internship reports.
6. Approve/reject monthly reports.
7. Use department-level AI summaries.
8. Message students.

### Major Admin Flows

1. View platform dashboard.
2. Manage users.
3. Approve/reject company and supervisor onboarding requests.
4. Review internships/applications.
5. Moderate feedback and reports.
6. View analytics.

### Frontend Strengths

- Clear role-based route organization.
- Strong coverage of real business workflows.
- Good dashboard/component separation in many areas.
- Dark mode support exists.
- English/Arabic i18n infrastructure exists.
- Messaging, notifications, CV, reports, dashboards, and AI features are integrated into user flows.

### Frontend Weaknesses

- Many large client-heavy pages.
- Some pages perform multiple sequential Supabase queries.
- Duplicate UI systems exist: `components/ui` and `components/common`.
- Some components appear unused, especially older internship filters/forms.
- Role-home and onboarding redirect logic is duplicated across files.
- Accessibility needs review for sidebars, drawers, cyclic widgets, and emoji-driven status UI.
- Some admin/company text is still hardcoded instead of fully i18n-managed.

### Frontend Improvements

- Consolidate `components/common` into `components/ui`.
- Remove unused components.
- Split large pages into smaller server/client boundaries.
- Add a data-fetch caching layer.
- Reduce query waterfalls.
- Standardize i18n usage.
- Add accessibility testing for keyboard/focus behavior.

---

## 6. Authentication, Authorization, API, And Server Logic Audit

### Auth Model

Authentication uses Supabase Auth with cookie/session handling through `@supabase/ssr`.

Important files:

- `lib/supabase/client.ts`
- `lib/supabase/server.ts`
- `lib/supabase/admin.ts`
- `lib/auth.ts`
- `middleware.ts`
- `app/auth/signup/page.tsx`
- `app/auth/login/page.tsx`
- `app/auth/callback/route.ts`

### Signup Flow

The signup UI lets the user choose:

- student
- company
- supervisor

However, the database keeps privileged role assignment controlled. Company/supervisor intent goes through `role_upgrade_requests`. Admin approval promotes users via RPC.

This is a good security design because users cannot simply sign up as company/supervisor/admin and gain privileges immediately.

### Middleware Behavior

`middleware.ts` handles:

- public routes
- protected route redirects
- Supabase user loading
- profile role loading
- suspension redirect
- role upgrade state
- pending approval redirect
- role-specific route permissions
- supervisor `/companies` rewrite to `/supervisor/companies`

### Middleware Weaknesses

- Missing Supabase env causes middleware to pass through instead of fail closed.
- `/settings` bypasses normal role matrix.
- API routes are not protected by middleware and rely on per-route checks.
- Onboarding logic is duplicated in middleware, login, and callback paths.
- Approved upgrade bypass allows company/supervisor protected paths while role may still read as student.

### API Route Inventory

| Area | Routes |
|---|---|
| Applications | `/api/applications/apply`, `/api/applications/commit` |
| Recommendations | `/api/recommendations/internships`, `/api/recommendations/internships/[internshipId]` |
| Embeddings | `/api/embeddings/generate`, `/api/embeddings/refresh` |
| AI | `/api/chat/student-assistant`, `/api/resume/improve`, `/api/ai/cover-letter`, `/api/ai/task-to-skill` |
| Feedback | `/api/feedback/analyze` |
| Notifications | `/api/notifications/dispatch`, `/api/notifications/process-email-queue` |
| Email | `/api/email/status`, `/api/email/test`, `/api/email/welcome` |
| Company | `/api/company/logo`, `/api/company/applications/[applicationId]/cv` |
| Reports | `/api/internship-reports/[reportId]/pdf` |
| Skills | `/api/student-skills/add-to-cv`, `/api/student-report-skills/[skillId]` |
| Dashboard | `/api/dashboard/student/weekly-insights` |

### API Strengths

- Most sensitive APIs check Supabase session.
- Role checks are present in most route handlers.
- Ownership checks are done for applications, CV access, reports, skills, and company assets.
- OpenAI calls are server-side only.
- Service-role access is generally used after authorization checks.
- Some endpoints have rate limiting.

### API Security Risks

| Risk | Severity | Details |
|---|---|---|
| Public email diagnostics | High | `/api/email/status` and `/api/email/test` expose provider metadata |
| Public test email sending | High | `/api/email/test` POST can send test emails without auth |
| Optional cron secret | High | `/api/notifications/process-email-queue` is open if `CRON_SECRET` is unset |
| Profile self-update risk | High | RLS may allow users to update their own `profiles.role` unless blocked elsewhere |
| In-memory rate limits | Medium | Not shared across instances |
| Service-role routes | Medium | Bugs can bypass RLS |
| Verbose logging | Medium | Some routes log sensitive operational details |
| No CSRF-specific layer | Medium | Cookie-authenticated POST APIs rely on default browser/session behavior |

### API Improvements

- Require auth/admin role for email diagnostics.
- Require `CRON_SECRET` always in production.
- Add database protection preventing self role escalation.
- Add a shared `requireUser`, `requireRole`, and `requireOwner` route helper.
- Add tests for every service-role route.
- Replace in-memory rate limiting.
- Remove verbose production logs.

---

## 7. Database And Supabase Audit

### Database Architecture

The database is Supabase Postgres with:

- `auth.users` as identity source
- `profiles` as app identity and role table
- RLS enabled across core tables
- many `SECURITY DEFINER` helper functions
- storage policies for CVs, logos, reports
- triggers for workflow automation
- RPCs for admin actions, report workflows, recommendations, summaries, and analytics

### Core Tables

| Table | Purpose |
|---|---|
| `profiles` | App user identity, role, suspension, notification prefs |
| `students` | Student profile, department, CV, embedding |
| `student_additional_info` | GPA, skills, courses, preferences |
| `student_preferences` | Legacy/duplicate preferences table |
| `companies` | Company profile, logo, cached reputation statistics |
| `supervisors` | Supervisor profile and department |
| `internship_positions` | Company listings and listing embeddings |
| `applications` | Student applications and commitment lifecycle |
| `internships` | Accepted placement tracking |
| `student_training_evaluations` | Post-training evaluation data |
| `ratings` | Legacy company ratings |
| `feedback_analysis` | AI sentiment and dimension analysis |
| `internship_monthly_reports` | Monthly report workflow |
| `internship_weekly_reports` | Weekly work descriptions |
| `internship_attendance` | Attendance records |
| `internship_employer_evaluations` | Company evaluation of trainee |
| `internship_final_reports` | Final PDF upload metadata |
| `user_signatures` | Digital signatures |
| `notifications` | In-app notification records |
| `transactional_email_queue` | Outbound queued email |
| `notification_delivery_outbox` | Delivery routing/outbox model |
| `role_upgrade_requests` | Company/supervisor approval requests |
| `dm_conversations` | Direct message threads |
| `dm_messages` | Direct messages |
| `dm_contacts` | Saved message contacts |
| `student_report_skills` | AI-extracted skills from reports |

### Storage Buckets

| Bucket | Public | Purpose |
|---|---:|---|
| `student-cvs` | No | Private CV PDFs |
| `company-logos` | Yes | Public company logos |
| `internship-report-pdfs` | No | Generated monthly report PDFs |
| `final-internship-reports` | No | Student final reports |

### RLS Strategy

RLS is a major strength of the project. Access is mostly enforced through:

- ownership checks
- role checks
- company owns position/application joins
- supervisor same-department checks
- admin helper checks
- participant-based report access
- notification authorization helpers

### Database Strengths

- Strong role-aware data model.
- Good use of RLS across core tables.
- Rich domain workflows in migrations.
- Admin actions are encapsulated as RPCs.
- Storage buckets have meaningful policies.
- Signup role hardening prevents direct privileged signup.
- Internship reports and commitment workflows are modeled in the database, not only in UI.

### Database Weaknesses

- Many `SECURITY DEFINER` RPCs increase audit burden.
- Some maintenance RPCs may be callable by any authenticated user.
- Some public/aggregate company feedback RPCs may reveal more than intended.
- Vector indexes are missing/deferred.
- Notification architecture has overlapping queue/outbox concepts.
- Legacy fields/tables remain: `student_preferences`, `ratings`, `students.skills`, `cv_url`.
- Schema truth is spread across many patch migrations.

### Database Improvements

- Add immutable role protections for non-admin users.
- Review all `SECURITY DEFINER` grants.
- Restrict maintenance RPCs to service role/admin.
- Add missing performance indexes.
- Add vector indexes or optimized vector search.
- Consolidate legacy tables/fields where possible.
- Document final ERD separately from migration history.
- Decide on one notification queue/outbox model.

---

## 8. Most Important Risks

### High Priority

1. **Public email diagnostics and test-send endpoints**
   - Lock down `/api/email/status` and `/api/email/test`.

2. **Optional cron secret**
   - Queue processing should never be public in production.

3. **Possible profile role self-update**
   - Enforce role immutability at DB level for non-admin users.

4. **Service-role route dependency**
   - Add automated authorization tests.

### Medium Priority

1. **In-memory rate limiting**
   - Replace with shared rate limiter.

2. **No vector index**
   - Add vector search optimization.

3. **Client-heavy frontend**
   - Reduce query waterfalls and large client bundles.

4. **Overlapping notification pipelines**
   - Simplify and standardize.

5. **Large assistant context**
   - Move toward retrieval-based context construction.

---

## 9. What Is Good

- Strong product scope.
- Good role model.
- Strong Supabase/RLS foundation.
- Real end-to-end internship lifecycle.
- Useful AI features rather than superficial AI branding.
- Admin approval flow for privileged roles.
- Private storage for sensitive files.
- Company reputation scoring exists.
- Notifications and messaging are integrated.
- Monthly report workflow is unusually complete for an MVP.

---

## 10. What Is Not Good

- Some production endpoints are too open.
- Rate limiting is MVP-level.
- Background jobs are endpoint/client-triggered instead of reliable scheduled workers.
- Recommendation search is not scalable yet.
- UI and schema contain duplicate/legacy remnants.
- Large client pages will become hard to maintain.
- Security-sensitive service-role routes need tests.
- Some production logs are too verbose.

---

## 11. Recommended Improvement Plan

### Phase 1: Security Hardening

- Protect email diagnostic/test endpoints.
- Require `CRON_SECRET`.
- Fix profile role immutability.
- Remove production debug logs.
- Review all `SECURITY DEFINER` grants.

### Phase 2: Production Operations

- Add Vercel/Supabase scheduled jobs.
- Add monitoring for email queue, OpenAI usage, API failures, and Supabase errors.
- Add retry/dead-letter logic for outbound email.
- Add shared rate limiting.

### Phase 3: Scalability

- Add vector indexes or optimized recommendation RPC.
- Cache recommendations per student.
- Batch embedding generation.
- Split large assistant context into retrieval-only context.

### Phase 4: Code Quality

- Consolidate duplicate UI components.
- Remove unused components.
- Consolidate role redirect helpers.
- Split large pages into smaller modules.
- Standardize i18n.

### Phase 5: Testing

- Add role-based E2E tests.
- Add API authorization tests.
- Add RLS policy tests.
- Add AI response parsing tests.
- Add report workflow regression tests.

---

## 12. Final Verdict

This is a serious and feature-complete internship SaaS platform, not a shallow prototype. The business logic is broad, and many flows are implemented end-to-end. The strongest technical decision is the Supabase/RLS-centered architecture with admin-approved role upgrades.

The project is suitable for demo, academic evaluation, internal testing, or controlled beta. Before broad public production, the team should prioritize security hardening, operational reliability, rate limiting, vector-search performance, and cleanup of duplicate/legacy code.

