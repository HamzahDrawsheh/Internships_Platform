# Step 5 — API Routes and Authentication

## 1. What was implemented

- **Auth middleware** (`middleware/auth.ts`): Reads `Authorization: Bearer <token>`, verifies the JWT with `SUPABASE_JWT_SECRET` (jsonwebtoken), extracts `sub` (and optional `email`, `user_metadata`). Sets `req.user = { id, email?, user_metadata? }`. Returns 401 if header missing or token invalid. Express `Request` is extended via `types/express.d.ts` so `req.user` is typed.
- **Error handler** (`middleware/errorHandler.ts`): Last middleware. Maps `NotFoundError` → 404, `ConflictError` → 409, `ZodError` → 400 (with `details`), others → 500. Responses are JSON `{ error }` (and `details` for validation).
- **Validation** (`routes/validation.ts`): Zod schemas for PATCH /profiles/me, list internships query, create/patch internship body, post application body, patch application status body.
- **Routes**: Auth (GET /auth/me), profiles (GET/PATCH /profiles/me), internships (GET list, GET/POST/PATCH by id, GET/POST /internships/:id/applications), applications (GET /applications, PATCH /applications/:id). All protected routes use `authMiddleware`. Authorization: profiles = own only; POST internships = company role; PATCH internship = owner; GET/POST applications by internship = company owner / student apply; PATCH application status = company owner of the internship.
- **App wiring** (`app.ts`): Mounts /auth, /profiles, /internships, /applications and registers the error handler last.

One DB addition: `getApplicationById` in `db/applications.ts` for PATCH application ownership check (no change to existing DB behavior).

## 2. Files created

| File | Purpose |
|------|---------|
| `backend/src/types/express.d.ts` | Extend Express Request with `req.user` |
| `backend/src/middleware/auth.ts` | JWT verification, set req.user |
| `backend/src/middleware/errorHandler.ts` | Map errors to status codes and JSON |
| `backend/src/routes/validation.ts` | Zod schemas for bodies and query |
| `backend/src/routes/auth.ts` | GET /auth/me |
| `backend/src/routes/profiles.ts` | GET /profiles/me, PATCH /profiles/me |
| `backend/src/routes/internships.ts` | GET/POST/PATCH internships, GET/POST /internships/:id/applications |
| `backend/src/routes/applications.ts` | GET /applications, PATCH /applications/:id |
| `CONTEXT_ENG/BACKEND_STEP5_API_ROUTES.md` | This file |

**Updated:** `backend/package.json` (jsonwebtoken, @types/jsonwebtoken), `backend/src/app.ts` (mount routes + errorHandler), `backend/src/db/applications.ts` (getApplicationById).

## 3. Endpoints implemented

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /health | No | Health check |
| GET | /auth/me | Yes | Current user id + profile (ensure profile exists) |
| GET | /profiles/me | Yes | Current user's profile |
| PATCH | /profiles/me | Yes | Update own profile (role, full_name, email) |
| GET | /internships | No | List internships (query: status, location_type, duration_weeks, deadline_lte) |
| GET | /internships/:id | No | Get one internship |
| POST | /internships | Yes (company) | Create internship |
| PATCH | /internships/:id | Yes (owner) | Update internship |
| GET | /internships/:id/applications | Yes (company owner) | List applications for internship |
| POST | /internships/:id/applications | Yes (student) | Apply to internship |
| GET | /applications | Yes (student) | List current user's applications |
| PATCH | /applications/:id | Yes (company owner) | Update application status |

## 4. Middleware added

- **auth.ts:** Reads `Authorization: Bearer <token>`, verifies with `jwt.verify(token, SUPABASE_JWT_SECRET)`, sets `req.user` from payload `sub`, `email`, `user_metadata`. On missing or invalid token sends 401 JSON `{ error: "..." }`.
- **errorHandler.ts:** Four-argument Express error middleware. `NotFoundError` → 404, `ConflictError` → 409, `ZodError` → 400 with `error` + `details`, any other → 500. All responses JSON `{ error }` (and `details` for 400).

## 5. Example requests

```bash
# Health (no auth)
curl -s http://localhost:3001/health

# Auth/me (replace TOKEN with Supabase access_token)
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3001/auth/me

# Profiles
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3001/profiles/me
curl -s -X PATCH -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"role":"student","full_name":"Alice"}' http://localhost:3001/profiles/me

# Internships
curl -s "http://localhost:3001/internships?status=active&location_type=remote"
curl -s http://localhost:3001/internships/INTERNSHIP_ID
curl -s -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"title":"ML Intern","skills":["Python"],"status":"active"}' http://localhost:3001/internships
curl -s -X PATCH -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"closed"}' http://localhost:3001/internships/INTERNSHIP_ID

# Applications
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3001/applications
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3001/internships/INTERNSHIP_ID/applications
curl -s -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"cover_letter":"I am interested."}' http://localhost:3001/internships/INTERNSHIP_ID/applications
curl -s -X PATCH -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"accepted"}' http://localhost:3001/applications/APPLICATION_ID
```

## 6. Next step

**Step 6 — Testing endpoints**

- Provide a short list of example `curl` or `fetch` calls (or a small script) to hit each endpoint: health, auth/me, profiles/me, internships list and by id, create internship, applications list, apply, update status. Include how to obtain a Supabase access token (e.g. login via frontend and copy from session or use a test token). Optionally add a Postman/Insomnia collection or a markdown file with all examples. No server or DB logic changes; documentation and examples only.

Stop after Step 5. Wait for your confirmation before proceeding to Step 6.
