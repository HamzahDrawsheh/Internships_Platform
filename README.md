# InternConnect Jordan

InternConnect Jordan is a web platform that connects AI and Data Science students in Jordan with companies offering internships.

The platform allows:
- Students to discover and apply to internships
- Companies to post internships and review applicants
- University supervisors to monitor student internships

---

## Tech Stack

| Layer | Technology |
|--------|------------|
| Web app | Next.js 16 (App Router), React, TypeScript, Tailwind CSS |
| Server logic | Next.js Route Handlers (`frontend/app/api/`) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (CVs, company logos) |
| AI / email | OpenAI, SMTP / Resend (via server routes only) |

There is **no separate FastAPI/Python backend** in this repository. The app is a **full-stack Next.js project** backed by Supabase.

---

## Project Structure

```
Intrenships_Platform-1/
├── frontend/              # Full-stack Next.js application
│   ├── app/               # Pages, layouts, and API routes
│   ├── components/        # UI components
│   ├── lib/               # Shared logic (Supabase, AI, email, i18n, …)
│   ├── supabase/migrations/  # Canonical database schema (SQL migrations)
│   ├── middleware.ts      # Auth / route protection
│   └── package.json
├── CONTEXT_ENG/           # Product and engineering documentation
└── README.md
```

**Source of truth for the database:** `frontend/supabase/migrations/`  
Apply with `npm run supabase:push` from the `frontend/` directory (after linking your Supabase project).

---

## Running the Project

```bash
cd frontend
npm install
cp .env.example .env.local   # if present; configure Supabase + OpenAI + email keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Useful scripts (from `frontend/`)

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run supabase:push` | Push migrations to linked Supabase project |

---

## Architecture (short)

```
Browser
  ├─► Next.js pages (React UI)
  ├─► Supabase client (direct reads/writes, protected by RLS)
  └─► /app/api/* routes (OpenAI, embeddings, email, PDFs, sensitive flows)
         └─► Supabase admin client + external services
```

Most CRUD uses the Supabase client from the browser with **RLS policies**.  
Secrets (API keys, service role) stay on the server in Route Handlers.

---

## Documentation

Project documentation lives in `CONTEXT_ENG/`:

- `PRD.md`
- `Implementation.md`
- `UI_UX_doc.md`
- `Project_structure.md`
- `Bug_tracking.md`

---

## Project Status

Currently under active development (MVP stage).
