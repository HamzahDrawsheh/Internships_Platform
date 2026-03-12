# Step 3 — Backend Setup

## 1. What was created

- **Backend package:** `backend/` with Node.js + TypeScript, Express, better-sqlite3, Zod, dotenv, and CORS. Scripts: `dev` (tsx watch), `build`, `start`.
- **Config:** Env loaded via dotenv and validated with Zod (`PORT`, `DATABASE_PATH`, `SUPABASE_JWT_SECRET`, `NODE_ENV`). Invalid env throws at startup.
- **SQLite:** Single connection in `src/db/connection.ts`. DB file created if missing; schema is run from the repo’s `CONTEXT_ENG/sqlite-schema.sql` (no copy in backend). Schema path is resolved from `process.cwd()` so it works when run from project root or from `backend/`.
- **Express app:** `src/app.ts` — `express.json()`, `cors()`, and `GET /health` returning `{ status: "ok" }`. Exported for use in `index.ts`.
- **Server:** `src/index.ts` loads config, initializes DB (so schema runs on first request/listen), then starts the HTTP server. No auth, no feature routes, no repos or services.

## 2. Files created/updated

| File | Action |
|------|--------|
| `backend/package.json` | Created |
| `backend/tsconfig.json` | Created |
| `backend/.env.example` | Created |
| `backend/.gitignore` | Created |
| `backend/.env` | Created (local only; in .gitignore) |
| `backend/src/config.ts` | Created |
| `backend/src/db/connection.ts` | Created |
| `backend/src/app.ts` | Created |
| `backend/src/index.ts` | Created |
| `CONTEXT_ENG/BACKEND_STEP3_SETUP.md` | Created (this file) |

No `backend/src/db/schema.sql` — schema is reused from `CONTEXT_ENG/sqlite-schema.sql`.

## 3. Important code decisions

- **CommonJS:** `tsconfig` uses `"module": "CommonJS"` so the built app runs with `node dist/index.js` without `"type": "module"`.
- **Schema path:** Schema is read from the repo: `CONTEXT_ENG/sqlite-schema.sql` or `../CONTEXT_ENG/sqlite-schema.sql` relative to `process.cwd()`, so running from project root or from `backend/` both work.
- **DB path:** `DATABASE_PATH` is resolved with `path.resolve(process.cwd(), config.DATABASE_PATH)`, so a value like `./database.db` creates the file in the current working directory (usually `backend/` when you `npm run dev` from `backend/`).
- **Dev script:** `"dev": "npx tsx watch src/index.ts"` so the local `tsx` is used even when `node_modules/.bin` isn’t on PATH (e.g. some Windows setups).

## 4. Run instructions

From the **project root** or from **backend/**:

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set DATABASE_PATH and SUPABASE_JWT_SECRET (use a placeholder for JWT until Step 4).
npm run dev
```

Or from project root:

```bash
cd Intrenships_Platform
cd backend
npm install
copy .env.example .env   # Windows
npm run dev
```

If you see a “file is being used by another process” error on Windows when loading `better_sqlite3.node`, close any other Node process using the backend (e.g. another terminal running `npm run dev`).

## 5. Verification

- **Startup:** Console should log: `Server listening on http://localhost:3001` (or the port in `.env`). A SQLite file appears at the path given by `DATABASE_PATH` (e.g. `backend/database.db`).
- **Health:** `GET http://localhost:3001/health` should return status 200 and body `{ "status": "ok" }` (e.g. `curl http://localhost:3001/health` or open in browser).

## 6. Next step

**Step 4 — Database layer**

- Add **models** (TypeScript types/interfaces for Profile, Internship, Application aligned with the SQLite schema and optional Zod schemas for parsing rows).
- Implement the **database access** layer in `src/db/`: `profiles.ts`, `internships.ts`, `applications.ts` with functions such as getById, upsert (profiles), list/getById/create/update (internships), listByStudent/listByInternship/create/updateStatus (applications). Use the existing `getDb()` and raw SQL or prepared statements; no ORM.
- Optionally add **migrations or schema versioning** (e.g. a simple version table and running schema only if needed); for now, “schema on first run” is enough.
- Do **not** add API routes or auth middleware yet; Step 4 is only the DB layer so that Step 5 can call it.

Stop after Step 3. Wait for your confirmation before proceeding to Step 4.
