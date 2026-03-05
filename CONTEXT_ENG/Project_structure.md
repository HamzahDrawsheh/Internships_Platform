# PROJECT STRUCTURE DOCUMENT
## InternConnect Jordan
### Codebase Structure (Next.js + FastAPI + Supabase)

---

**Version**  
1.0 — MVP

**Date**  
March 4, 2026

**Audience**  
Engineering Team

---

# 01 Repository Layout

The repository is organized as a monorepo with three main parts:

- `frontend/` → Next.js application
- `backend/` → FastAPI application
- `CONTEXT_ENG/` → product + technical context documents for AI-assisted development
internconnect-jordan/
├── frontend/
├── backend/
└── CONTEXT_ENG


---

# 02 Frontend Structure (Next.js)

We use Next.js App Router.



frontend/
├── app/
│ ├── (public)/
│ │ ├── page.tsx # Landing page
│ │ └── layout.tsx
│ │
│ ├── auth/
│ │ ├── login/page.tsx
│ │ ├── signup/page.tsx
│ │ └── verify/page.tsx # optional
│ │
│ ├── internships/
│ │ ├── page.tsx # browse internships
│ │ └── [id]/page.tsx # internship details
│ │
│ ├── applications/
│ │ └── page.tsx # student applications
│ │
│ ├── notifications/
│ │ └── page.tsx
│ │
│ ├── dashboard/
│ │ ├── student/page.tsx
│ │ ├── company/page.tsx
│ │ └── supervisor/page.tsx
│ │
│ ├── profile/
│ │ ├── student/page.tsx
│ │ └── company/page.tsx
│ │
│ ├── company/
│ │ └── internships/
│ │ ├── page.tsx # manage internships
│ │ ├── new/page.tsx # create internship
│ │ └── [id]/
│ │ ├── edit/page.tsx # edit internship
│ │ └── applications/page.tsx # applicants list
│ │
│ ├── supervisor/
│ │ ├── students/page.tsx
│ │ ├── students/[id]/page.tsx
│ │ └── reports/page.tsx
│ │
│ └── admin/
│ ├── dashboard/page.tsx
│ ├── users/page.tsx
│ ├── internships/page.tsx
│ └── analytics/page.tsx
│
├── components/
│ ├── layout/
│ │ ├── Navbar.tsx
│ │ ├── Sidebar.tsx
│ │ └── ProtectedRoute.tsx
│ │
│ ├── common/
│ │ ├── Button.tsx
│ │ ├── Input.tsx
│ │ ├── Modal.tsx
│ │ ├── Badge.tsx
│ │ └── EmptyState.tsx
│ │
│ ├── internships/
│ │ ├── InternshipCard.tsx
│ │ ├── InternshipFilters.tsx
│ │ └── InternshipForm.tsx
│ │
│ ├── applications/
│ │ ├── ApplicationTable.tsx
│ │ └── ApplicationStatusBadge.tsx
│ │
│ └── notifications/
│ ├── NotificationBell.tsx
│ └── NotificationList.tsx
│
├── lib/
│ ├── supabase/
│ │ ├── client.ts # browser client
│ │ └── server.ts # server client (SSR)
│ │
│ ├── api.ts # fetch wrapper for FastAPI
│ ├── auth.ts # auth helpers
│ └── constants.ts
│
├── middleware.ts # role-based route protection
├── styles/ # optional (if not using Tailwind)
├── public/ # images, icons
└── package.json


---

# 03 Backend Structure (FastAPI)

FastAPI uses a modular structure: core, routes, schemas, services.




backend/
├── app/
│ ├── main.py # FastAPI app entry, CORS, routers
│ │
│ ├── core/
│ │ ├── config.py # env settings
│ │ ├── security.py # JWT validation, dependencies
│ │ └── logging.py # logging config
│ │
│ ├── api/
│ │ ├── deps.py # get_current_user, require_roles
│ │ └── routes/
│ │ ├── health.py
│ │ ├── internships.py
│ │ ├── applications.py
│ │ ├── profiles.py
│ │ ├── supervisor.py
│ │ ├── admin.py
│ │ └── notifications.py
│ │
│ ├── schemas/
│ │ ├── internship.py
│ │ ├── application.py
│ │ ├── profile.py
│ │ └── notification.py
│ │
│ ├── services/
│ │ ├── supabase_client.py # wrapper for supabase python client
│ │ ├── internship_service.py
│ │ ├── application_service.py
│ │ ├── profile_service.py
│ │ ├── notification_service.py
│ │ └── storage_service.py # signed urls for CV
│ │
│ └── utils/
│ ├── pagination.py
│ └── errors.py
│
├── tests/
│ ├── test_auth.py
│ ├── test_internships.py
│ └── test_applications.py
│
├── requirements.txt
├── .env.example
└── README.md


---

# 04 Documentation Structure (CONTEXT_ENG)

CONTEXT_ENG/
├── PRD.md
├── Implementation.md
├── UI_UX_doc.md
├── Project_structure.md
└── Bug_tracking.md


These files are the authoritative project context for:

- planning
- building with AI tools (Cursor)
- keeping implementation aligned with PRD

---

# 05 Naming Conventions

Frontend:
- Pages: `page.tsx`
- Dynamic routes: `[id]`
- Components: PascalCase (`InternshipCard.tsx`)
- API calls: centralized in `lib/api.ts`


## Frontend Styling Rules

The frontend uses **Tailwind CSS** for all styling.

Guidelines:

- Use Tailwind utility classes inside React components.
- Avoid large custom CSS files.
- Keep styling inside the component when possible.
- Shared UI elements (buttons, cards, forms) should be implemented as reusable components in:


Backend:
- Routes: plural naming (`internships.py`, `applications.py`)
- Services: `<domain>_service.py`
- Schemas: domain-based (`internship.py`)
- Dependencies: all auth deps in `api/deps.py`

---

# 06 API Integration (Frontend ↔ Backend)

Frontend calls backend via:

- `lib/api.ts` wrapper
- sends Supabase JWT token in:
  - `Authorization: Bearer <token>`

Backend validates JWT using Supabase JWKS and enforces role-based access.

---

# 07 Supabase Responsibilities

Supabase handles:

- Auth users and sessions
- Postgres database (RLS enabled)
- Storage for CVs and logos

FastAPI handles:

- Business logic
- Role enforcement
- Secure signed URL generation
- Advanced queries and reporting

