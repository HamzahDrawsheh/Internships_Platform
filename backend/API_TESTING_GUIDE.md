# Step 6 — API Testing Guide

## 1. Overview

This guide explains how to run the backend, obtain a Supabase access token, and test every API endpoint with **curl** and **JavaScript fetch**. Use it to verify the backend works and to integrate the frontend with the REST API. No backend code changes are required.

**Base URL (default):** `http://localhost:3001`

---

## 2. How to run the backend

1. **Install dependencies** (from project root or `backend/`):
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   copy .env.example .env   # Windows
   # cp .env.example .env   # macOS/Linux
   ```
   Edit `.env` and set:
   - `DATABASE_PATH` — path to SQLite file (e.g. `./database.db`)
   - `SUPABASE_JWT_SECRET` — from Supabase Dashboard → Project Settings → API → JWT Secret

3. **Start the server:**
   ```bash
   npm run dev
   ```
   You should see: `Server listening on http://localhost:3001`

4. **Quick check:**
   ```bash
   curl http://localhost:3001/health
   ```
   Expected: `{"status":"ok"}`

---

## 3. Getting a Supabase access token

The API expects `Authorization: Bearer <access_token>`. The token is the **Supabase session access token**.

**Option A — From the frontend (recommended):**

1. Start your Next.js frontend and open the app in the browser.
2. Log in (or sign up) so Supabase creates a session.
3. In the browser console, run:
   ```js
   const { data } = await window.__supabase?.auth.getSession();
   console.log(data?.session?.access_token);
   ```
   Or, if you expose the Supabase client: get the session (e.g. from React state or a hook that calls `getSession()`) and read `session.access_token`.

**Option B — From Supabase Dashboard:**

1. Go to Supabase Dashboard → Authentication → Users.
2. You cannot copy a token from here; use Option A or sign in via your app and copy the token from DevTools (Application → Local Storage, or from a `getSession()` call in code).

**Option C — For automated tests:**

Use Supabase Auth API to sign in and get the session (e.g. `POST https://<project>.supabase.co/auth/v1/token?grant_type=password` with email/password), then use `access_token` from the response.

**Replace `TOKEN` in the examples below with the actual `access_token` string.**

---

## 4. Curl examples

Use these from a terminal. Replace `TOKEN` with your Supabase access token, and replace `INTERNSHIP_ID` / `APPLICATION_ID` with real IDs from previous responses.

### Health

```bash
# GET /health — no auth
curl -s http://localhost:3001/health
# Expected: {"status":"ok"}
```

### Auth

```bash
# GET /auth/me — requires auth; returns id + profile (creates profile if missing)
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3001/auth/me
# Expected: {"id":"uuid","profile":{...}}
```

### Profiles

```bash
# GET /profiles/me
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3001/profiles/me

# PATCH /profiles/me — update role, full_name, or email
curl -s -X PATCH -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d "{\"role\":\"student\",\"full_name\":\"Alice\",\"email\":\"alice@example.com\"}" \
  http://localhost:3001/profiles/me
```

### Internships

```bash
# GET /internships — list (optional query: status, location_type, duration_weeks, deadline_lte)
curl -s http://localhost:3001/internships
curl -s "http://localhost:3001/internships?status=active&location_type=remote"

# GET /internships/:id
curl -s http://localhost:3001/internships/INTERNSHIP_ID

# POST /internships — company only
curl -s -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d "{\"title\":\"ML Intern\",\"description\":\"Work on models.\",\"location_type\":\"remote\",\"skills\":[\"Python\",\"SQL\"],\"duration_weeks\":12,\"open_positions\":2,\"status\":\"active\"}" \
  http://localhost:3001/internships

# PATCH /internships/:id — owner only
curl -s -X PATCH -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d "{\"status\":\"closed\"}" \
  http://localhost:3001/internships/INTERNSHIP_ID
```

### Applications

```bash
# GET /applications — current user's applications (student)
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3001/applications

# GET /internships/:id/applications — list applications for an internship (company owner)
curl -s -H "Authorization: Bearer TOKEN" http://localhost:3001/internships/INTERNSHIP_ID/applications

# POST /internships/:id/applications — apply (student)
curl -s -X POST -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d "{\"cover_letter\":\"I am very interested in this role.\"}" \
  http://localhost:3001/internships/INTERNSHIP_ID/applications

# PATCH /applications/:id — update status (company owner)
curl -s -X PATCH -H "Authorization: Bearer TOKEN" -H "Content-Type: application/json" \
  -d "{\"status\":\"accepted\"}" \
  http://localhost:3001/applications/APPLICATION_ID
```

---

## 5. JavaScript fetch examples

Use these in the frontend. Get the token from the Supabase session (e.g. `session.access_token`). Prefer an env variable for the API base URL (e.g. `NEXT_PUBLIC_API_URL`).

```js
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

// Get token from Supabase session (e.g. in a component or hook)
// const { data: { session } } = await supabase.auth.getSession();
// const token = session?.access_token;
```

### Fetching internships (no auth)

```js
const res = await fetch(`${API_URL}/internships?status=active`);
const { data } = await res.json();
// data: array of internships
```

### Fetching internships with auth (e.g. for consistency)

```js
const res = await fetch(`${API_URL}/internships`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
const { data } = await res.json();
```

### Getting current user and profile

```js
const res = await fetch(`${API_URL}/auth/me`, {
  headers: { Authorization: `Bearer ${token}` },
});
const { id, profile } = await res.json();
```

### Creating an internship (company)

```js
const res = await fetch(`${API_URL}/internships`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    title: "Data Science Intern",
    description: "Work on ML pipelines.",
    location_type: "remote",
    skills: ["Python", "SQL"],
    duration_weeks: 12,
    open_positions: 2,
    status: "active",
  }),
});
const internship = await res.json(); // 201 Created
```

### Applying to an internship (student)

```js
const res = await fetch(`${API_URL}/internships/${internshipId}/applications`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    cover_letter: "I am interested in this position.",
  }),
});
const application = await res.json(); // 201 Created
```

### Updating application status (company)

```js
const res = await fetch(`${API_URL}/applications/${applicationId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ status: "accepted" }),
});
const updated = await res.json(); // 200 OK
```

### Patching own profile (onboarding)

```js
const res = await fetch(`${API_URL}/profiles/me`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({
    role: "student",
    full_name: "Alice",
    email: "alice@example.com",
  }),
});
const profile = await res.json();
```

---

## 6. Common errors

All error responses are JSON with an `error` field. Validation errors also include a `details` object.

| Status | Meaning | When it happens |
|--------|---------|-----------------|
| **400 Bad Request** | Validation failed | Invalid or missing body/query (e.g. wrong type, missing required field, invalid enum). Check the `details` field for field-level errors. |
| **401 Unauthorized** | Not authenticated | Missing `Authorization` header, wrong format (not `Bearer <token>`), or invalid/expired JWT. Get a fresh token from Supabase session. |
| **403 Forbidden** | Not allowed | Valid token but wrong role or ownership: e.g. student calling POST /internships, company calling POST /internships/:id/applications, or user updating another user’s internship/application. |
| **404 Not Found** | Resource missing | No internship/application/profile for the given id. Check the id and that the resource exists. |
| **409 Conflict** | Duplicate or conflict | e.g. Student already applied to this internship (unique internship_id + student_id). |
| **500 Internal Server Error** | Server error | Unexpected error; check server logs. |

**Example 401 response:**
```json
{"error":"Missing or invalid Authorization header"}
```

**Example 400 response (validation):**
```json
{
  "error": "Validation failed",
  "details": { "body": { "title": ["Required"] } }
}
```

**Example 409 response:**
```json
{"error":"Application already exists for this internship and student."}
```

---

## 7. Testing workflow

1. **Start the backend**
   - `cd backend && npm install && npm run dev`
   - Confirm: `curl http://localhost:3001/health` → `{"status":"ok"}`

2. **Log in via the frontend**
   - Run the Next.js app and sign in (or sign up) so Supabase creates a session.

3. **Copy the access token**
   - From browser console: get the session (e.g. via your app’s Supabase client) and copy `session.access_token`.
   - Or from code: `const { data: { session } } = await supabase.auth.getSession(); console.log(session?.access_token);`

4. **Test endpoints with curl**
   - Set `TOKEN=<paste_token>` in the shell (or replace in each curl).
   - Run the curl examples from section 4 in order: health → auth/me → profiles/me → internships list → create internship (if company) → applications (if student/company).

5. **Optional: test from the frontend**
   - Replace Supabase client data calls with `fetch(API_URL + path, { headers: { Authorization: \`Bearer ${session.access_token}\` } })` using the fetch examples in section 5.

---

## 8. Files created

| File | Purpose |
|------|---------|
| `backend/API_TESTING_GUIDE.md` | This testing guide (curl, fetch, errors, workflow). |

No other files were created. No backend code was modified.

---

## 9. Final step

The backend is implemented and documented. Next, **integrate it with the frontend**:

- Point the frontend to the backend base URL (e.g. `NEXT_PUBLIC_API_URL=http://localhost:3001`).
- Replace Supabase client calls for **profiles**, **internships**, and **applications** with `fetch` to the REST endpoints, sending `Authorization: Bearer ${session.access_token}`.
- Keep using Supabase for **auth only** (login, signup, session, cookies).
- Use this guide to verify each endpoint during development and when debugging.

After frontend integration, run through the testing workflow and the curl/fetch examples to confirm end-to-end behavior.
