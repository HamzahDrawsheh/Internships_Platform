# Graduation Project - Data Science


## Students:

- **Hamzah Drawsheh**
- **Mahde Hanandeh**
- **Mohammad Othman**
- **Jad Awad-Allah**


# Internships Platform

This project is an **Internship Management Platform** for IT students, companies, and university supervisors.  
It provides a structured, organized, and transparent environment to manage internship opportunities, applications, and monitoring.

---

## Features

- **Students**: Browse and apply to internships, manage applications, view notifications.  
- **Companies**: Post internships, manage applications, edit internships, view analytics.  
- **Supervisors**: Monitor students, approve applications, generate reports.  
- **Admin**: Manage users, internships, dashboards for analytics and monitoring.

---

## Tech Stack

**Frontend**:
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- Shadcn/UI components

**Backend & Database**:
- Node.js + Express (custom backend)
- SQLite (via `better-sqlite3`) as the local data store
- Supabase Auth for authentication (JWTs verified by the backend using JWKS)

Demo data for local development is loaded into the SQLite database via the backend seed script (see below).

---

## Project Structure

```text
Intrenships_Platform/
├─ frontend/          → Next.js application code
│   ├─ app/           → App Router pages and layouts
│   ├─ components/    → React components
│   ├─ lib/           → Supabase clients, backend API client, auth, types
│   └─ public/        → Static assets
├─ backend/           → Express + TypeScript API (SQLite, auth, seed)
├─ CONTEXT_ENG/       → Project documentation and implementation guides
├─ Project Diagrams/  → UML diagrams, business process flows
```

---

## Frontend development

Run the Next.js app from the `frontend` directory:

```bash
cd frontend
npm install
npm run dev
```

The site will be available at **http://localhost:3000**.

---

## Backend development & demo data

Run the backend API from the `backend` directory:

```bash
cd backend
npm install
npm run dev
```

The API will be available at **http://localhost:3001**.

### Demo data (SQLite)

To populate the local SQLite database with demo profiles, internships, and applications:

```bash
cd backend
npm run seed
```

This will clear the existing SQLite tables and insert demo data via `src/seed.ts`.  
This is the **recommended and only supported way** to create demo data now.  
The previous Supabase-based `frontend/app/api/create-demo/route.ts` has been removed to avoid duplicating demo logic.

### Environment variables

Create a `frontend/.env.local` file with:

- `NEXT_PUBLIC_SUPABASE_URL` – your Supabase project URL  
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` – your Supabase anon/public key  

Next.js loads these automatically from `.env.local`.

### Clearing cache (if dev server crashes or behaves oddly)

Delete the build cache and restart:

```bash
cd frontend
npm run clean
npm run dev
```

Or manually remove the `.next` folder in `frontend`, then run `npm run dev`.
