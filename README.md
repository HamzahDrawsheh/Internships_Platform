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
- Supabase (PostgreSQL)
- Supabase Auth for authentication
- Supabase Storage for file management

> Note: This project is primarily a frontend application integrated with Supabase. No separate FastAPI backend is used.

---

## Project Structure

```text
Intrenships_Platform/
├─ frontend/          → Next.js application code
│   ├─ app/           → App Router pages and layouts
│   ├─ components/    → React components
│   ├─ lib/           → Supabase clients, auth, types
│   └─ public/        → Static assets
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
