# Step 4 — Database Layer

## 1. What was implemented

- **Models** (`backend/src/models/types.ts`): TypeScript interfaces aligned with the SQLite schema — `Profile`, `Internship`, `Application`, and enums `LocationType`, `ApplicationStatus`, `InternshipStatus`, `ProfileRole`. Insert/update input types (`ProfileInsert`, `ProfileUpdate`, `InternshipInsert`, `InternshipUpdate`, `ApplicationInsert`, `ListInternshipsFilters`) for the DB layer.
- **DB utilities** (`backend/src/db/utils.ts`): `parseSkills` / `serializeSkills` for the JSON `skills` column; `mapRowToProfile`, `mapRowToInternship`, `mapRowToApplication` to turn raw SQLite rows into clean model objects.
- **Errors** (`backend/src/db/errors.ts`): `NotFoundError` and `ConflictError` for not-found and unique-constraint cases.
- **Profiles** (`backend/src/db/profiles.ts`): `getProfileById`, `getProfileByIdOrThrow`, `upsertProfile`, `updateProfile`. No joins; single-table access.
- **Internships** (`backend/src/db/internships.ts`): `listInternships(filters?)` with optional filters (status, location_type, duration_weeks, deadline_lte), joining `profiles` for `company_name`; `getInternshipById`, `getInternshipByIdOrThrow`, `createInternship`, `updateInternship`. Skills stored as JSON string.
- **Applications** (`backend/src/db/applications.ts`): `listApplicationsByStudent`, `listApplicationsByInternship` (both join internship and company for `internship_title` and `company_name`); `createApplication` (checks duplicate internship_id + student_id and throws `ConflictError`); `updateApplicationStatus`. All return clean `Application` objects with optional `internship_title` and `company_name`.

All DB access uses `getDb()` and prepared statements; no raw row shapes are exposed.

## 2. Files created

| File | Purpose |
|------|---------|
| `backend/src/models/types.ts` | Profile, Internship, Application, enums, insert/update types |
| `backend/src/db/errors.ts` | NotFoundError, ConflictError |
| `backend/src/db/utils.ts` | parseSkills, serializeSkills, mapRowTo* helpers |
| `backend/src/db/profiles.ts` | getProfileById, getProfileByIdOrThrow, upsertProfile, updateProfile |
| `backend/src/db/internships.ts` | listInternships, getInternshipById, getInternshipByIdOrThrow, createInternship, updateInternship |
| `backend/src/db/applications.ts` | listApplicationsByStudent, listApplicationsByInternship, createApplication, updateApplicationStatus |
| `CONTEXT_ENG/BACKEND_STEP4_DATABASE_LAYER.md` | This file |

## 3. Functions implemented

**profiles.ts**

- `getProfileById(id)` → `Profile | null`
- `getProfileByIdOrThrow(id)` → `Profile` (throws NotFoundError)
- `upsertProfile(profile)` → `Profile`
- `updateProfile(id, fields)` → `Profile` (throws NotFoundError if not found)

**internships.ts**

- `listInternships(filters?)` → `Internship[]` (includes company_name via join)
- `getInternshipById(id)` → `Internship | null`
- `getInternshipByIdOrThrow(id)` → `Internship` (throws NotFoundError)
- `createInternship(data)` → `Internship`
- `updateInternship(id, fields)` → `Internship` (throws NotFoundError if not found)

**applications.ts**

- `listApplicationsByStudent(studentId)` → `Application[]` (includes internship_title, company_name)
- `listApplicationsByInternship(internshipId)` → `Application[]` (includes internship_title, company_name)
- `createApplication(data)` → `Application` (throws ConflictError if duplicate internship_id+student_id)
- `updateApplicationStatus(id, status)` → `Application` (throws NotFoundError if not found)

## 4. Important implementation decisions

- **Skills column:** Stored as JSON string; `parseSkills()` in utils parses to `string[]`; `serializeSkills()` writes back. Used in `mapRowToInternship`, `createInternship`, and `updateInternship`.
- **Joins:** `listInternships` and `getInternshipById` LEFT JOIN `profiles` on `company_id` and select `full_name AS company_name`. Application list queries JOIN `internships` and LEFT JOIN `profiles` (company) to attach `internship_title` and `company_name`.
- **Duplicate application:** Before insert, `createApplication` runs a SELECT for `(internship_id, student_id)`. If a row exists, it throws `ConflictError` with a clear message instead of relying only on SQLite UNIQUE.
- **Not found:** `updateProfile`, `updateInternship`, `updateApplicationStatus` and the internal `getInternshipByIdOrThrow` / `getProfileByIdOrThrow` use `NotFoundError` when the entity does not exist.
- **Return shape:** Every public function returns plain TypeScript objects (Profile, Internship, Application); no DB row type is exported.

## 5. Example usage

```ts
import * as profilesDb from "./db/profiles";
import * as internshipsDb from "./db/internships";
import * as applicationsDb from "./db/applications";
import { randomUUID } from "node:crypto";

// Profile
const profile = profilesDb.upsertProfile({
  id: randomUUID(),
  email: "u@example.com",
  full_name: "User",
  role: "student",
});
const found = profilesDb.getProfileById(profile.id);
profilesDb.updateProfile(profile.id, { role: "company" });

// Internships
const list = internshipsDb.listInternships({ status: "active", location_type: "remote" });
const one = internshipsDb.getInternshipById("some-id");
const created = internshipsDb.createInternship({
  id: randomUUID(),
  company_id: profile.id,
  title: "ML Intern",
  skills: ["Python", "SQL"],
  status: "active",
});

// Applications
const byStudent = applicationsDb.listApplicationsByStudent(profile.id);
const byInternship = applicationsDb.listApplicationsByInternship(created.id);
const app = applicationsDb.createApplication({
  id: randomUUID(),
  internship_id: created.id,
  student_id: profile.id,
  cover_letter: "Hello",
});
applicationsDb.updateApplicationStatus(app.id, "accepted");
```

## 6. Next step

**Step 5 — API routes**

- Add auth middleware that verifies the Supabase JWT, reads `sub` as the user id, and attaches it to the request (e.g. `req.user.id`). Protect routes that require authentication.
- Implement REST endpoints as in Step 2: auth (e.g. GET /auth/me), profiles (GET /profiles/me, PATCH /profiles/me), internships (GET/POST/PATCH, GET by id), applications (GET list, POST to apply, PATCH status). Wire each endpoint to the corresponding DB layer functions and return appropriate status codes and JSON. Use Zod to validate request bodies and query params; use the central error handler to map NotFoundError → 404, ConflictError → 409, validation errors → 400.
- Do not change the database layer or server startup; only add routes and middleware.

Stop after Step 4. Wait for your confirmation before proceeding to Step 5.
