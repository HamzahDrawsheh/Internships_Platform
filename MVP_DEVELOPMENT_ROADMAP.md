# MVP Development Roadmap — InternConnect Jordan

This roadmap gets the platform to a **functional MVP** where:
- **Students** can browse internships and apply.
- **Companies** can post internships and see applicants.

It specifies **implementation order**, **files to change**, **tables used**, and **how to test** each step. No new database tables are required; use the existing schema in `CONTEXT_ENG/supabase-schema-complete.sql`.

---

## Prerequisites Before Starting

1. **Database**: Run `CONTEXT_ENG/supabase-schema-complete.sql` in Supabase SQL Editor so `profiles`, `internships`, and `applications` exist with RLS.
2. **Env**: `frontend/.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. **Run app**: `cd frontend && npm install && npm run dev`.

---

## Feature Order Overview

| Step | Feature | Owner flow | Tables |
|------|---------|------------|--------|
| 1 | Browse internships | Student | `internships`, `profiles` |
| 2 | Internship detail + Apply | Student | `internships`, `profiles`, `applications` |
| 3 | Create internship | Company | `internships` |
| 4 | Edit internship | Company | `internships` |
| 5 | Company: view applicants + update status | Company | `applications`, `profiles`, `internships` |

Implement in this order so you can test the full loop (company creates → student browses → student applies → company sees and updates).

---

---

## Step 1: Browse Internships

**Goal:** On `/internships`, load active internships from Supabase and show them with filters.

### 1.1 Order of implementation
- Add Supabase query for `internships` (status = active) with optional join for company name.
- Apply filters (search, location_type, skill, deadline) to the query.
- Render list using existing `InternshipCard` or a simple grid; show empty state when no results.

### 1.2 Files to modify

| File | Changes |
|------|--------|
| `frontend/app/internships/page.tsx` | Add `useEffect` (or fetch on mount) with `createClient()` from `@/lib/supabase/client`. Query `internships` with `.eq("status", "active")`. Optionally join `profiles` on `company_id` to get `full_name` as company name. Apply filter state (search, locationType, skill, deadlineBefore) to the query (e.g. `.ilike("title", `%${search}%`)`, `.eq("location_type", locationType)`, `.contains("skills", skill ? [skill] : [])`, `.lte("deadline", deadlineBefore)` only when set). Store results in state; show loading then list or empty state. Use existing `InternshipCard` (from `@/components/internships/InternshipCard`) for each item; pass `internship` with `company_name` from join. |

### 1.3 Database tables

- **`internships`**: `id`, `company_id`, `title`, `description`, `location_type`, `skills`, `duration_weeks`, `start_date`, `deadline`, `open_positions`, `status`.
- **`profiles`** (optional join): `full_name` for company name (where `profiles.id = internships.company_id`).

**Query shape (conceptual):**
- Select from `internships` where `status = 'active'`.
- Optional: `.select('*, company:profiles!company_id(full_name)')` and map `company.full_name` to `company_name` for each row.
- Apply filters when the user has set them; then set state and render.

### 1.4 How to test

1. **No data:** Log in as student, go to `/internships`. You should see “No internships available” or empty state (no errors).
2. **With data:** In Supabase SQL Editor, insert one row into `internships` with `status = 'active'`, `company_id` = a valid profile id (e.g. your company user’s profile id). Reload `/internships` — the listing should appear.
3. **Filters:** Set location type, skill, or deadline and confirm the list updates (or goes empty when nothing matches).
4. **Link:** Click “View Details” on a card and confirm navigation to `/internships/[id]` (detail page may still be placeholder until Step 2).

---

---

## Step 2: Internship Detail + Apply

**Goal:** `/internships/[id]` shows real data; “Apply” creates a row in `applications`.

### 2.1 Order of implementation
- Fetch internship by `id` (and company name from `profiles`).
- Handle not found (invalid id or not active) with redirect or message.
- Render title, company, description, skills, dates, open positions.
- When user clicks Apply: open existing modal; on “Submit application” get current user id, insert into `applications` (internship_id, student_id, cover_letter, status = 'submitted'). Handle duplicate (UNIQUE constraint): show “Already applied” and do not insert again. On success close modal and show success message or link to “My applications”.

### 2.2 Files to modify

| File | Changes |
|------|--------|
| `frontend/app/internships/[id]/page.tsx` | Replace hardcoded data with state. In `useEffect` (or on mount), call `createClient()` and fetch: `supabase.from("internships").select('*, company:profiles!company_id(full_name)').eq("id", id).single()`. If no row or status not active, show “Not found” or redirect to `/internships`. Map response to local state (title, companyName from company.full_name, description, location_type, skills, duration_weeks, start_date, deadline, open_positions). Add loading and error state. In the Apply modal footer, “Submit application” should: get session (e.g. `supabase.auth.getUser()`), then `supabase.from("applications").insert({ internship_id: id, student_id: user.id, cover_letter: coverLetter || null, status: 'submitted' })`. On conflict (23505) or existing check, show “You have already applied.” On success: close modal, set a small success state or `router.push("/applications")`. Keep “Cancel” as-is. |

### 2.3 Database tables

- **`internships`**: read by `id`; must be `status = 'active'` if you want to restrict applying to active only.
- **`profiles`**: join to get company `full_name`.
- **`applications`**: insert `internship_id`, `student_id`, `cover_letter`, `status` (default `submitted`). RLS allows student to insert when `student_id = auth.uid()`.

### 2.4 How to test

1. **Detail load:** As student, open `/internships/[id]` with a valid active internship id. You should see real title, company name, description, skills, dates.
2. **Invalid id:** Open `/internships/00000000-0000-0000-0000-000000000000`. You should see not found or redirect, not placeholder data.
3. **Apply:** Click Apply, optionally enter cover letter, Submit. Check Supabase `applications` table for new row. Then open “My applications” and see the new application.
4. **Duplicate:** Apply again to the same internship. You should see “Already applied” (or a constraint error handled gracefully), and only one row in `applications` for that (internship_id, student_id).

---

---

## Step 3: Create Internship

**Goal:** Company can create a new internship from `/company/internships/new`; data is saved to Supabase.

### 3.1 Order of implementation
- On form submit (Publish or Save as draft), get current user id.
- Map form fields to `internships` columns: title, description, location_type, skills (split comma-separated string into array), duration_weeks (parse int), start_date, deadline, open_positions (parse int), status = 'active' for Publish or 'draft' for Save as draft, company_id = user.id.
- Insert into `internships`. On success redirect to `/company/internships`. On error show message (e.g. validation or RLS).

### 3.2 Files to modify

| File | Changes |
|------|--------|
| `frontend/app/company/internships/new/page.tsx` | In `handlePublish`: e.preventDefault(), get `supabase.auth.getUser()`, then `supabase.from("internships").insert({ company_id: user.id, title, description, location_type: locationType || null, skills: skills ? skills.split(",").map(s => s.trim()).filter(Boolean) : [], duration_weeks: durationWeeks ? parseInt(durationWeeks, 10) : null, start_date: startDate || null, deadline: deadline || null, open_positions: parseInt(openPositions, 10) || 1, status: 'active' })`. On success: `router.push("/company/internships")`. In `handleSaveDraft`: same but `status: 'draft'`. Add loading and error state (e.g. setError from insert error). Optional: basic validation (title required, open_positions >= 1). |

### 3.3 Database tables

- **`internships`**: insert one row. RLS “Company can manage own internships” allows insert when `company_id = auth.uid()`.

### 3.4 How to test

1. **Publish:** Log in as company. Go to Create internship, fill title and description (required), choose location, add skills, set deadline. Click Publish. You should redirect to company internships list and see the new listing with status “active”.
2. **Draft:** Same form, click “Save as Draft”. List should show the new listing with status “draft”. In Supabase, the row should have `status = 'draft'`.
3. **Browse as student:** Only active listings appear on `/internships`. Confirm the draft does not appear; the published one does (after Step 1).
4. **Validation:** Submit with empty title and confirm you show an error or prevent submit.

---

---

## Step 4: Edit Internship

**Goal:** Company can edit an existing internship from `/company/internships/[id]/edit`; changes are saved to Supabase.

### 4.1 Order of implementation
- On load, fetch internship by `id`; verify `company_id === current user id` (otherwise redirect or 404).
- Populate form state with fetched data (title, description, location_type, skills as comma-separated string, duration_weeks, start_date, deadline, open_positions).
- On submit (Update or Save as draft): call `supabase.from("internships").update({ title, description, location_type, skills array, duration_weeks, start_date, deadline, open_positions, status: 'active' or 'draft' }).eq("id", id).eq("company_id", user.id)`. Redirect on success; show error on failure.

### 4.2 Files to modify

| File | Changes |
|------|--------|
| `frontend/app/company/internships/[id]/edit/page.tsx` | Add state for loading and error. In `useEffect`, fetch: `supabase.from("internships").select("*").eq("id", id).single()`. If no row or `data.company_id !== user.id`, redirect to `/company/internships` or show not found. Set form state from `data` (skills: `(data.skills || []).join(", ")`). In `handleUpdate`: same mapping as create, but `.update({ ... }).eq("id", id)` (and optionally `.eq("company_id", user.id)` for safety). In `handleSaveDraft`: update with `status: 'draft'`. After success, `router.push("/company/internships")`. |

### 4.3 Database tables

- **`internships`**: select by id; update same row. RLS allows update when `company_id = auth.uid()`.

### 4.4 How to test

1. **Load:** As company, open edit for an internship you own. Form should show current title, description, skills, dates.
2. **Update:** Change title and save. Reload edit page and list page; changes should persist.
3. **Save as draft:** Change status to draft via “Save as Draft”. List should show draft; browse page (student) should not show it if you filter by active only.
4. **Wrong company:** Log in as another company (or student) and try to open edit for another company’s internship. You should get 404 or redirect (RLS will prevent update; you can also check company_id in the app).

---

---

## Step 5: Company — View Applicants + Update Status

**Goal:** On `/company/internships/[id]/applications`, show applicants for that internship and allow updating application status (e.g. under_review, accepted, rejected).

### 5.1 Order of implementation
- Fetch applications for this `internship_id` (and verify the internship belongs to current user).
- Join `profiles` on `student_id` to get student name (e.g. `full_name`).
- Render table: student name, applied date, status, actions (e.g. dropdown or buttons: Under review, Accept, Reject).
- On action: call `supabase.from("applications").update({ status: newStatus }).eq("id", applicationId)`. Optionally refetch or update local state.

### 5.2 Files to modify

| File | Changes |
|------|--------|
| `frontend/app/company/internships/[id]/applications/page.tsx` | Replace `applicants: unknown[] = []` with state (e.g. `applicants`, `loading`, `error`). In `useEffect`, get `user` from `supabase.auth.getUser()`, then fetch internship: `supabase.from("internships").select("id").eq("id", id).eq("company_id", user.id).single()`. If not found, redirect to `/company/internships`. Then fetch: `supabase.from("applications").select('id, status, cover_letter, created_at, student:profiles!student_id(full_name)').eq("internship_id", id).order("created_at", { ascending: false })`. Map to local shape (id, student_name from student.full_name, status, cover_letter, created_at). Set state. In the table, render one row per applicant. Add actions: e.g. Select or buttons to set status to `under_review`, `accepted`, `rejected`. On click: `supabase.from("applications").update({ status }).eq("id", applicationId)`; then refetch or optimistically update state. Keep EmptyState when `applicants.length === 0`. Optional: show cover letter in a modal or expandable row. |

### 5.3 Database tables

- **`internships`**: check ownership by `company_id`.
- **`applications`**: select by `internship_id`; update `status` by application `id`. RLS “Company can view/update applications for own internships” allows this.
- **`profiles`**: join on `student_id` to get `full_name`.

### 5.4 How to test

1. **No applicants:** As company, open Applicants for an internship that has no applications. You should see “No applicants yet”.
2. **With applicants:** As student, apply to that internship (Step 2). As company, open same internship’s Applicants page. You should see one row with student name, date, status “submitted”.
3. **Update status:** Click “Under review” or “Accept” / “Reject”. Row should update; reload or refetch to confirm persistence. As student, open “My applications” and confirm status changed.
4. **Wrong internship:** Try to open applicants for an internship id that is not yours. You should be redirected or see empty/forbidden.

---

---

## Cross-Check: Full MVP Flow

After all steps, run this flow once end-to-end:

1. **Company:** Sign up (or use existing company account) → complete onboarding (role Company) → Create internship (Publish) → see it on company list → optionally Edit → open Applicants (empty).
2. **Student:** Sign up (or use existing student account) → complete onboarding (role Student) → Browse internships → see the active listing → open detail → Apply (with or without cover letter) → see it under My applications.
3. **Company:** Open Applicants for that internship → see the student → set status to Under review, then Accept (or Reject).
4. **Student:** Open My applications → confirm status is updated.

No new tables or schema changes are required; only the four features above need to be implemented in the listed files.

---

## Optional Quick Wins (After MVP)

- **Loading states:** Add a simple loading spinner or skeleton on browse, detail, create, edit, and applicants pages.
- **Error messages:** Show Supabase or validation errors in the UI (e.g. under the form or in a toast).
- **Success feedback:** After apply or after status update, show “Application submitted” or “Status updated” and optionally link to applications list.
- **Empty states:** Reuse existing EmptyState components with clear copy (e.g. “No active internships right now” vs “No applicants yet”).

---

## File Reference Summary

| Step | Primary file(s) to modify |
|------|----------------------------|
| 1 – Browse | `frontend/app/internships/page.tsx` |
| 2 – Detail + Apply | `frontend/app/internships/[id]/page.tsx` |
| 3 – Create | `frontend/app/company/internships/new/page.tsx` |
| 4 – Edit | `frontend/app/company/internships/[id]/edit/page.tsx` |
| 5 – Applicants | `frontend/app/company/internships/[id]/applications/page.tsx` |

Existing components you can reuse: `InternshipCard`, `EmptyState`, `Button`, `Input`, `Select`, `Textarea`, `Modal`, `Table`, `Badge`, `Container`, `PageHeader`. Types: `Internship`, `Application` in `frontend/lib/types.ts`. Supabase client: `createClient()` from `@/lib/supabase/client` (client components) or `@/lib/supabase/server` (server components / route handlers).
