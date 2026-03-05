# UI/UX DOCUMENT
## InternConnect Jordan
### UI Structure · User Flows · Page Specs (MVP)

---

**Version**  
1.0 — MVP

**Date**  
March 4, 2026

**Audience**  
Design, Frontend, Backend

**Roles**  
Student · Company · Supervisor · Admin

---

# 01 Design Goals

- Simple and clear navigation for each role
- Fast internship discovery and application flow for students
- Efficient applicant review flow for companies
- Full monitoring visibility for supervisors
- Basic moderation and analytics for admins

---

# 02 Global UI Rules

## Navigation (Top Navbar)
- Logo + platform name (InternConnect Jordan)
- Role-based navigation items
- Profile menu (Settings + Logout)
- Notification bell icon (unread badge)

## Layout
- Desktop-first (responsive for mobile)
- Consistent page header:
  - Page title
  - Short description
  - Primary action button when needed

## Components (Reusable)
- Button (primary/secondary/danger)
- Input, Select, Textarea
- Card (InternshipCard, CompanyCard)
- Badge (status)
- Table (applications, internships)
- Modal (confirm delete / confirm status change)
- Tabs (profile sections)
- Pagination + Search bar
- Empty state component (no items yet)

---

# 03 User Flows (MVP)

## 3.1 Student Flow
1. Signup → choose role = Student
2. Complete student profile + upload CV
3. Browse internships → filter/search
4. Open internship details → Apply
5. Track application status from "My Applications"

## 3.2 Company Flow
1. Signup → choose role = Company
2. Complete company profile + upload logo
3. Create internship listing
4. View applicants inbox
5. Accept / Reject applicants

## 3.3 Supervisor Flow
1. Signup → choose role = Supervisor
2. Supervisor dashboard shows assigned students
3. Open student details → view applications + placement status
4. Export report CSV

## 3.4 Admin Flow
1. Admin login
2. View users + suspend if needed
3. View pending internships (if moderation ON)
4. Approve / Reject internship
5. View analytics overview

---

# 04 Sitemap / Pages (MVP)

## 4.1 Public Pages
- `/` Landing
- `/auth/login` Login
- `/auth/signup` Signup
- `/auth/verify` Verify Email (optional)

## 4.2 Student Pages
- `/dashboard/student` Student Dashboard
- `/internships` Browse Internships
- `/internships/[id]` Internship Details
- `/applications` My Applications
- `/profile/student` Student Profile
- `/notifications` Notifications (shared for all roles)

## 4.3 Company Pages
- `/dashboard/company` Company Dashboard
- `/company/internships` Manage Internships
- `/company/internships/new` Create Internship
- `/company/internships/[id]/edit` Edit Internship
- `/company/internships/[id]/applications` Applicants per Internship
- `/profile/company` Company Profile

## 4.4 Supervisor Pages
- `/dashboard/supervisor` Supervisor Dashboard
- `/supervisor/students` Students List
- `/supervisor/students/[id]` Student Details (monitoring)
- `/supervisor/reports` Reports Export

## 4.5 Admin Pages
- `/admin/dashboard` Admin Dashboard
- `/admin/users` User Management
- `/admin/internships` Internship Moderation
- `/admin/analytics` Analytics

---

# 05 Page Specs (What each page contains)

## 5.1 Landing Page (`/`)
### Purpose
Introduce the platform and drive signup/login.

### Sections
- Hero: title + short description + CTA buttons (Sign Up / Login)
- How it works (3 steps)
- Partner companies (logos)
- Footer: contact + links

---

## 5.2 Login (`/auth/login`)
### Fields
- Email
- Password
- Login button

### Actions
- "Forgot password" (optional)
- Link to signup

---

## 5.3 Signup (`/auth/signup`)
### Fields
- Full name
- Email
- Password
- Role selection (Student / Company / Supervisor)

### Actions
- Create account
- After signup → show "Verify your email" message

---

# STUDENT

## 5.4 Student Dashboard (`/dashboard/student`)
### Widgets
- Summary cards:
  - Total applications
  - Under review
  - Accepted
- Recent applications list (last 5)
- Quick CTA: "Browse internships"

---

## 5.5 Browse Internships (`/internships`)
### Layout
- Left: Filters panel
- Right: Internship cards list

### Filters
- Location type: Remote / Onsite / Hybrid
- Skill tags
- Deadline (before date)
- Company (optional)
- Search bar (title/company)

### Card content
- Internship title
- Company name + logo
- Location type badge
- Required skills (top 3)
- Deadline
- Button: View Details

---

## 5.6 Internship Details (`/internships/[id]`)
### Sections
- Header: title + company + apply button
- Internship description
- Required skills
- Duration + Start date + Deadline
- Company profile mini section
- Bookmark button (optional)

### Primary action
- Apply

---

## 5.7 My Applications (`/applications`)
### Table columns
- Internship
- Company
- Applied date
- Status badge
- Action: View

### Status badges
- Submitted
- Under Review
- Accepted
- Rejected

---

## 5.8 Student Profile (`/profile/student`)
### Sections
- Personal info: name, university, major, year
- Skills: tags input
- Bio: textarea
- CV upload:
  - Upload PDF
  - Show current file status

### Actions
- Save changes

---

# COMPANY

## 5.9 Company Dashboard (`/dashboard/company`)
### Widgets
- Active internships count
- Total applications received
- Recent applicants (last 5)

### CTA
- Create internship

---

## 5.10 Manage Internships (`/company/internships`)
### Table columns
- Title
- Status
- Deadline
- Applicants count
- Actions: Edit, Pause, Close, View Applicants

---

## 5.11 Create Internship (`/company/internships/new`)
### Form fields
- Title
- Description
- Location type
- Required skills
- Duration weeks
- Start date
- Deadline
- Open positions

### Actions
- Save as Draft
- Submit / Publish (depending on moderation)

---

## 5.12 Applicants per Internship (`/company/internships/[id]/applications`)
### Table columns
- Student name
- University + year
- Skills (top)
- Status
- Actions: View profile, Accept, Reject

### Applicant detail drawer/modal
- Full profile
- CV download (signed link)
- Internal notes field

---

## 5.13 Company Profile (`/profile/company`)
### Fields
- Company name
- Industry
- Website
- Description
- Logo upload

### Action
- Save changes

---

# SUPERVISOR

## 5.14 Supervisor Dashboard (`/dashboard/supervisor`)
### Widgets
- Total assigned students
- Total applications (aggregate)
- Total placed students

### Table preview
- Students list (top 10)

---

## 5.15 Students List (`/supervisor/students`)
### Table columns
- Student name
- University
- Total applications
- Acceptance count
- Placement status (placed / not placed)
- Action: View details

---

## 5.16 Student Details (`/supervisor/students/[id]`)
### Sections
- Student profile summary
- Applications history table
- Placement status card
- Notes (optional)

---

## 5.17 Reports Export (`/supervisor/reports`)
### Actions
- Download CSV placements report

---

# ADMIN

## 5.18 Admin Dashboard (`/admin/dashboard`)
### Widgets
- Total users by role
- Active internships
- Total applications
- Acceptance rate

---

## 5.19 User Management (`/admin/users`)
### Table columns
- Name
- Email
- Role
- Status (active/suspended)
- Action: Suspend/Unsuspend

---

## 5.20 Internship Moderation (`/admin/internships`)
### Table columns
- Internship title
- Company
- Submitted date
- Status
- Actions: Approve, Reject

---

## 5.21 Analytics (`/admin/analytics`)
### Sections
- Graphs/metrics (MVP basic)
- Most active companies
- Most applied internships

---

# 06 Error States & Empty States

- No internships found → show empty state + "Clear filters"
- No applications yet → show CTA "Browse internships"
- Company has no listings → show CTA "Create internship"
- Supervisor has no assigned students → show contact admin message
- Admin: no pending internships → show "All caught up"

---

# 07 Accessibility (Basic)

- Keyboard navigation support
- Clear focus states
- Form validation messages
- Sufficient contrast for text and badges


### Design Implementation

All UI designs described in this document should be implemented using **Tailwind CSS** within Next.js components.