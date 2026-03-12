# Step 2 — Backend Architecture

**Date:** March 12, 2026  
**Purpose:** Define backend stack, folder structure, API contract, auth, validation, and frontend integration. No implementation yet.

---

## 1. Chosen stack

| Layer | Choice | Notes |
|-------|--------|--------|
| **Runtime** | Node.js | Same ecosystem as Next.js frontend. |
| **Language** | TypeScript | Shared types with frontend; type-safe DB and API. |
| **HTTP framework** | **Express** | Widely used, simple middleware model, easy to add auth and validation. |
| **SQLite driver** | **better-sqlite3** | Synchronous API, no native async needed for SQLite; fast and simple. |
| **Validation** | **Zod** | Schema validation for request bodies and query params; one lib for input + types. |
| **Environment** | **dotenv** | Load `.env` for `PORT`, `DATABASE_PATH`, `SUPABASE_JWT_SECRET`. |

No ORM: direct SQL via better-sqlite3 keeps the project small and matches the existing SQLite schema. Optional: a thin repository layer per entity (profiles, internships, applications) for clarity.

---

## 2. Authentication strategy

**Decision: Keep Supabase Auth; backend only verifies the JWT and uses `profiles.id`.**

**Why not replace Supabase Auth**

- The frontend already uses Supabase for sign-up, sign-in, session, cookies, and middleware. Replacing auth would require new login/signup APIs, session storage, and middleware changes.
- Supabase gives you email confirmation, password reset, and secure cookie handling. Reimplementing that in the backend is more work and risk.

**How it works**

1. User signs in via Supabase (frontend). Supabase sets session cookies and issues a JWT.
2. Frontend calls the backend with the Supabase access token in the `Authorization: Bearer <access_token>` header (or sends the session and backend reads the token from a dedicated header/cookie if you prefer).
3. Backend receives the request, reads the Bearer token, and verifies it using **Supabase JWT secret** (from Supabase project settings → API → `JWT Secret`). Verification yields the payload with `sub` (user id) and optionally `email`, `user_metadata`.
4. Backend treats `sub` as **`profiles.id`** for all authorization: every protected route gets `req.user.id = sub` and uses it for ownership checks (e.g. company_id, student_id).
5. **Profile row in SQLite:** There is no Supabase `profiles` table for data anymore; the source of truth is SQLite. So the backend must **ensure a profile row exists** for each authenticated user. On first use (e.g. when handling `GET /profiles/me` or any protected call), if no row exists for `sub`, the backend **inserts** one using `id = sub`, `email` from JWT, `full_name` from `user_metadata`, `role` from `user_metadata` or null (then onboarding sets role). This mirrors the current frontend `ensureProfile()` behavior in SQLite.

**Create-demo flow**

- Keep using the **Next.js API route** `app/api/create-demo/route.ts` to create users in **Supabase** (auth.admin.createUser). After each user is created, the frontend (or the same route) calls the **backend** to insert the corresponding profile and any demo internships/applications into **SQLite** (e.g. `POST /api/seed/demo` with a shared secret or admin-only check). So: Supabase = auth users; SQLite = profiles + internships + applications.

**Summary**

- **Auth:** Supabase only (login, signup, session, cookies). Backend does **not** implement login/signup.
- **Backend:** Verifies Supabase JWT with `SUPABASE_JWT_SECRET`, uses `sub` as `profiles.id`, ensures profile row exists in SQLite when needed.

---

## 3. Backend folder structure

```txt
backend/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── index.ts              # Entry: load env, init DB, mount app, start server
│   ├── app.ts                # Express app: CORS, JSON, auth middleware, routes
│   ├── config.ts             # Env validation (port, database path, JWT secret)
│   ├── db/
│   │   ├── connection.ts     # Open SQLite DB (better-sqlite3), run schema if missing
│   │   ├── schema.sql        # Copy or symlink to CONTEXT_ENG/sqlite-schema.sql
│   │   ├── profiles.ts       # getById, upsert, update
│   │   ├── internships.ts    # list, getById, create, update
│   │   └── applications.ts   # listByStudent, listByInternship, create, updateStatus
│   ├── middleware/
│   │   ├── auth.ts           # Verify Supabase JWT, set req.user = { id: sub }
│   │   └── errorHandler.ts  # Central error handler (4xx/5xx, JSON)
│   ├── routes/
│   │   ├── auth.ts           # GET /auth/me (optional: profile bootstrap)
│   │   ├── profiles.ts       # /profiles/me, PATCH /profiles/me
│   │   ├── internships.ts   # CRUD + list with filters
│   │   └── applications.ts   # CRUD + list by student or by internship
│   └── services/             # Optional: business logic above DB
│       ├── profileService.ts
│       ├── internshipService.ts
│       └── applicationService.ts
```

No separate “controllers” folder: route handlers can live in `routes/*` and call `services` or `db` directly. Keep it flat unless the codebase grows.

---

## 4. API design

All JSON. Base URL example: `http://localhost:3001`. Protected routes require `Authorization: Bearer <supabase_access_token>`.

### Auth

| Method | Path | Purpose | Request body | Response |
|--------|------|---------|--------------|----------|
| GET | /auth/me | Return current user id and optionally profile (ensure profile row exists). | — | 200: `{ id: string, profile?: Profile }`; 401 if invalid/missing token. |

No login/signup on backend; those stay in the frontend via Supabase.

---

### Profiles

| Method | Path | Purpose | Request body | Response |
|--------|------|---------|--------------|----------|
| GET | /profiles/me | Get current user's profile (ensure row exists from JWT, then return). | — | 200: Profile; 401 if unauthenticated. |
| PATCH | /profiles/me | Update current user's profile (role, full_name, email). Used by onboarding. | `{ role?, full_name?, email? }` | 200: Profile; 400 validation error; 401. |

All profile operations are scoped to the authenticated user (`req.user.id`). No listing or admin profile endpoints in the first version.

---

### Internships

| Method | Path | Purpose | Request body | Response |
|--------|------|---------|--------------|----------|
| GET | /internships | List internships. Query: `status`, `location_type`, `duration_weeks`, `deadline_lte`. Default: active only. | — | 200: `{ data: Internship[], total?: number }`. Each item may include `company_name` (join profiles). |
| GET | /internships/:id | Get one internship by id (with company_name). | — | 200: Internship; 404 if not found. |
| POST | /internships | Create internship (company only). | InternshipCreate body | 201: Internship; 400 validation; 401/403. |
| PATCH | /internships/:id | Update internship (owner company only). | Partial internship fields | 200: Internship; 400/401/403/404. |

**InternshipCreate body:** `title` (required), `description`, `location_type`, `skills` (array or JSON string), `duration_weeks`, `start_date`, `deadline`, `open_positions`, `status`. Backend sets `company_id = req.user.id`, `id` = new UUID.

---

### Applications

| Method | Path | Purpose | Request body | Response |
|--------|------|---------|--------------|----------|
| GET | /applications | List applications for the current user (student). | — | 200: `{ data: Application[] }` with `internship_title`, `company_name` when available. |
| GET | /internships/:id/applications | List applications for an internship (company owner only). | — | 200: `{ data: Application[] }` with student info if needed. |
| POST | /internships/:id/applications | Apply to internship (student). | `{ cover_letter? }` | 201: Application; 400 if already applied or validation; 401/403/404. |
| PATCH | /applications/:id | Update application status (company for own internship). | `{ status }` | 200: Application; 400/401/403/404. |

---

## 5. Validation and error handling

**Validation**

- Use **Zod** for all request bodies and query params. Define schemas per route (e.g. `patchProfileSchema`, `createInternshipSchema`, `listInternshipsQuerySchema`). On failure return **400** with a JSON body like `{ error: "Validation failed", details: ZodError.format() }`.
- Enums: `role`, `location_type`, `status` (internship/application) validated against allowed values from the schema.

**Error handling**

- **Central error handler** in `middleware/errorHandler.ts`: catch errors from route handlers and services, map to status codes, return JSON.
- **Conventions:**
  - **400** — Validation (Zod) or bad request (e.g. duplicate application).
  - **401** — Missing or invalid token (auth middleware).
  - **403** — Valid token but not allowed (e.g. company updating another company’s internship).
  - **404** — Resource not found (e.g. internship id not found).
  - **500** — Unexpected server error (log, do not leak internals in response).
- Response shape: `{ error: string }` for client-facing message; optionally `details` for 400 (e.g. validation errors). No stack traces in production.

---

## 6. Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| PORT | No (default 3001) | Backend server port. |
| DATABASE_PATH | Yes | Path to SQLite file (e.g. `./database.db` or absolute path). |
| SUPABASE_JWT_SECRET | Yes | Supabase project JWT secret (Settings → API → JWT Secret). Used to verify Bearer tokens. |
| NODE_ENV | No | `development` \| `production`; affects logging and possibly CORS. |

Frontend will need the backend base URL (e.g. `NEXT_PUBLIC_API_URL=http://localhost:3001`) for fetch calls. Backend may allow CORS origin from the frontend origin in development.

---

## 7. Frontend integration plan

**High level:** Frontend keeps Supabase for **auth only** (login, signup, session, middleware). All **data** (profiles, internships, applications) are read/written via the new backend API using the Supabase access token.

1. **Auth (unchanged)**  
   - Login, signup, logout, session, and middleware continue to use Supabase client and cookies. No change to auth UX.

2. **Getting the token for the backend**  
   - Where the frontend currently calls `supabase.from(...)`, it will call `fetch(backendUrl + path, { headers: { Authorization: 'Bearer ' + accessToken } })`.  
   - Get the access token from the session: `const { data: { session } } = await supabase.auth.getSession(); session?.access_token`. Use this in client components (e.g. in useEffect or data-fetching) and in server components/route handlers via the server Supabase client’s session.

3. **Replace Supabase data calls with backend API**  
   - **Profiles:** Replace `getProfile()` / `ensureProfile()` with `GET /profiles/me` (and optionally `GET /auth/me`). Replace profile update (onboarding) with `PATCH /profiles/me`.  
   - **Middleware:** Keep using Supabase `getUser()` for redirect logic. Optionally, middleware can call `GET /auth/me` or `GET /profiles/me` with the cookie-forwarded token to get role from the backend; or keep reading role from Supabase-backed profile until you fully migrate profile reads to the backend. Easiest: middleware stays as-is (Supabase getUser + Supabase profiles for role). Later, when all profile reads go to the backend, change middleware to call backend `GET /profiles/me` with the Supabase token (forward cookie or token in header).  
   - **Internships:** Replace `supabase.from('internships').select(...)` with `GET /internships` (and query params for filters). Replace single internship fetch with `GET /internships/:id`. Create/update with `POST /internships` and `PATCH /internships/:id`.  
   - **Applications:** Replace `supabase.from('applications').select(...).eq('student_id', user.id)` with `GET /applications`. Replace applications for one internship with `GET /internships/:id/applications`. Apply with `POST /internships/:id/applications`. Update status with `PATCH /applications/:id`.  
   - **Company dashboard counts:** Use `GET /internships` (filter by company is implicit on backend via token) and `GET /internships/:id/applications` for counts, or add small aggregate endpoints later if needed.

4. **Create-demo**  
   - Keep Supabase admin in Next.js route to create auth users. After creating each user, POST to backend (e.g. `POST /api/seed/demo` or `POST /profiles` with id/email/full_name/role) to insert profile and any demo data into SQLite. Backend route can be protected by a shared secret or by requiring an admin JWT.

5. **Shared types**  
   - Keep `frontend/lib/types.ts` as the source of truth for UI types. Backend can duplicate or import equivalent types (or generate from Zod schemas) so request/response shapes match (e.g. `Internship`, `Application`, `Profile`).

---

## 8. Files created in this step

- **CONTEXT_ENG/BACKEND_STEP2_ARCHITECTURE.md** — This document (architecture, API contract, auth, validation, env, frontend plan).

No code or scaffolding was added; only this architecture document.

---

## 9. Next step

**Step 3 — Backend setup**

- Create the `backend/` folder.
- Add `package.json` with dependencies: express, better-sqlite3, zod, dotenv; dev: typescript, ts-node or tsx, @types/node, @types/express.
- Add `tsconfig.json` for Node + strict TypeScript.
- Add `.env.example` with PORT, DATABASE_PATH, SUPABASE_JWT_SECRET.
- Implement `src/config.ts` to load and validate env.
- Implement `src/db/connection.ts` to open SQLite and apply schema (read from CONTEXT_ENG or copy schema).
- Implement `src/index.ts` to start Express and `src/app.ts` to mount JSON, CORS, and a health route (e.g. GET /health).
- Ensure the server runs and the database file is created with the correct tables.

**Stop after Step 2. Wait for your confirmation before proceeding to Step 3.**
