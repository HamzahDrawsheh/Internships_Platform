# PRODUCT REQUIREMENTS DOCUMENT  
## InternConnect Jordan  
### AI & Data Science Internship Platform  
**Connecting Students · Companies · Universities**

---

**Version**  
1.0 — Initial Release

**Date**  
March 4, 2026

**Status**  
Draft — For Review

**Prepared By**  
Product Management Team

**Audience**  
Engineering, Design, Stakeholders, University Partners

---

## 01 Project Overview

InternConnect Jordan is a purpose-built web platform that bridges the gap between AI and Data Science students in Jordanian universities and companies offering technical internships. The platform creates a structured, transparent, and digitally managed internship lifecycle — from discovery and application through supervision and completion.

The platform serves three primary stakeholders: students seeking real-world AI/DS experience, companies looking to recruit and develop emerging technical talent, and university supervisors who are responsible for monitoring and validating the internship process. By unifying these three parties in a single platform, InternConnect eliminates manual coordination, reduces administrative overhead, and ensures compliance with academic internship requirements.

Jordan's growing tech ecosystem — anchored by hubs in Amman such as King Hussein Business Park and the Jordan Response Innovation Lab — presents a strong opportunity to formalize the internship pipeline between universities like JU, PSUT, and GJU and local technology companies.

---

## 02 Problem Statement

The current internship process for AI and Data Science students in Jordan is fragmented, manual, and opaque. The following pain points have been identified across all three stakeholder groups:

### For Students
1. No centralized platform to discover internship opportunities relevant to AI/DS skills.
2. Application processes vary widely across companies — email, phone, walk-in — creating confusion.
3. Little to no visibility on application status after submission.
4. Difficulty connecting academic requirements with available industry positions.

### For Companies
1. No structured way to post openings and screen candidates from target universities.
2. High volume of unsolicited, unqualified applications due to lack of skill-based filtering.
3. Manual coordination with universities for verification and documentation.
4. No analytics on their hiring funnel or candidate pool quality.

### For University Supervisors
1. No visibility into where students apply or whether they are accepted.
2. Difficulty tracking internship progress and ensuring compliance with academic standards.
3. Manual approval workflows create bottlenecks and delays for students.
4. No data to assess program effectiveness or improve curriculum alignment with industry needs.

---

## 03 Proposed Solution

InternConnect Jordan provides a centralized, role-based web platform with tailored dashboards for each stakeholder. The solution consists of three integrated modules:

### Student Portal
1. A searchable, filterable directory of AI and Data Science internship listings.
2. A streamlined one-profile, multi-apply application system.
3. Real-time application status tracking with notifications.
4. A personal dashboard to manage all active and past applications.

### Company Portal
1. Tools to create, manage, and promote internship listings.
2. An applicant management interface to review, accept, or reject candidates.
3. Structured messaging with candidates through the platform.
4. Analytics on posted listings, application rates, and candidate profiles.

### Supervisor Dashboard
1. A read-access monitoring view of all students under their supervision.
2. Application and placement tracking per student.
3. Reporting tools to generate internship compliance reports.
4. Notifications when students are accepted or key milestones are reached.

---

## 04 Target Users

### Primary Users
1. AI & Data Science students at Jordanian universities (3rd and 4th year undergraduates, graduate students) seeking their first or second industry placement.
2. Tech companies and startups in Jordan hiring for internship roles in machine learning, data analytics, NLP, computer vision, or related fields.
3. University internship coordinators and academic supervisors at institutions offering AI/DS programs.

### Secondary Users
1. University administration seeking program quality data and alumni placement metrics.
2. Company HR teams and hiring managers who manage recruitment workflows.

### Market Context
1. Jordan has over 28 universities, with PSUT, JUST, GJU, and University of Jordan among those offering AI/CS programs.
2. The Jordan ICT sector employs over 18,000 people, with growing demand for data-literate roles.
3. Estimated initial addressable user base: 5,000–8,000 AI/DS students annually across affiliated universities.

---

## 05 User Roles

The platform defines four distinct roles, each with scoped permissions and tailored interfaces:

| Role | Description | Key Capabilities |
|------|-------------|------------------|
| Student | Enrolled AI/DS student seeking internship placement. | Browse listings, apply, track status, manage profile |
| Company | Employer posting internship opportunities. | Post listings, review applicants, accept/reject, message candidates |
| Supervisor | University academic coordinator overseeing internship compliance. | Monitor student applications, view placements, generate reports |
| Admin | Platform administrator managing users and content. | Manage all accounts, moderate listings, view platform analytics |

---

## 06 Core Features (MVP)

### 6.1 Authentication & Onboarding
1. Email-based registration and login with role selection (Student / Company / Supervisor).
2. Email verification required before accessing the platform.
3. Student profile creation: name, university, major, year, CV upload (PDF), skills, and bio.
4. Company profile creation: company name, industry, logo, website, and description.
5. Supervisor profile creation: name, university, department, and affiliated students.

### 6.2 Internship Listings (Company)
1. Companies can create internship listings with the following fields:
   1. Title, description, location (on-site / remote / hybrid)
   2. Required skills and qualifications
   3. Duration and start date
   4. Number of open positions
   5. Application deadline
2. Listings can be paused, edited, or closed at any time.
3. Listings are reviewed by Admin before going live (optional moderation toggle).

### 6.3 Internship Discovery & Search (Student)
1. Searchable listing index with filters for: skill, location type, duration, deadline, and company.
2. Each listing shows company name, role overview, deadline, and required skills.
3. Students can bookmark listings for later review.

### 6.4 Application Management
1. Students can apply to a listing with one click using their saved profile, optionally adding a cover letter.
2. Students can view a personal applications dashboard showing all submitted applications and their statuses: Submitted, Under Review, Accepted, Rejected.
3. Companies receive applications in a structured inbox with student profile previews.
4. Companies can move applications through workflow stages and leave internal notes.
5. Automated email notifications sent to students on status changes.

### 6.5 Supervisor Monitoring Dashboard
1. Supervisors can view a list of affiliated students and their application activity.
2. Dashboard shows: total applications, acceptance rate, and placement status per student.
3. Supervisors can flag issues or mark students as requiring follow-up.
4. Basic CSV export of student internship data for reporting purposes.

### 6.6 Notifications
1. In-app notification center for all users.
2. Email notifications for: application received (company), status change (student), new application from supervised student (supervisor).
3. Notification preferences manageable from user settings.

### 6.7 Admin Panel
1. User management: view, verify, suspend, or delete accounts.
2. Listing moderation: approve, reject, or flag company listings.
3. Platform analytics: registered users, active listings, applications submitted, acceptance rates.

---

## 07 Future Features

The following features are out of scope for MVP but are planned for subsequent releases based on user feedback and platform growth:

### Phase 2 — Enhanced Matching & Communication
1. AI-powered internship recommendations based on student skills and profile similarity.
2. In-platform direct messaging between students and company recruiters.
3. Video interview scheduling integration (e.g., Calendly or built-in scheduler).
4. Skill assessments or short tests companies can embed into listings.

### Phase 3 — Progress Tracking & Reporting
1. Internship progress log: students submit weekly reports directly on the platform.
2. Supervisor evaluation forms and digital sign-off workflows.
3. Company feedback and performance ratings for interns (anonymous to other companies).
4. Student portfolio builder with completed internship credentials and badges.

### Phase 4 — Ecosystem Expansion
1. Mobile application (iOS & Android) for students and companies.
2. Multi-university support with customizable supervisor dashboards per institution.
3. Integration with LinkedIn for profile import and verified placement sharing.
4. Expansion beyond Jordan to other Arab university markets (e.g., Egypt, Saudi Arabia).
5. Company-sponsored events: hackathons, open days, and info sessions posted on platform.

---

## 08 User Flows

### 8.1 Student: Discover and Apply for an Internship
1. Student registers with university email and selects the Student role.
2. Student completes profile: uploads CV, selects skills (e.g., Python, ML, SQL), and provides bio.
3. Student browses the listings page, applies filters (e.g., 'Remote', 'Machine Learning').
4. Student views a listing detail page, reviews requirements and company info.
5. Student clicks 'Apply', optionally writes a cover letter, and submits.
6. Student receives confirmation email and can track status in 'My Applications' dashboard.
7. Student is notified by email and in-app when the company updates their application status.

### 8.2 Company: Post a Listing and Manage Applications
1. Company registers and completes company profile (name, logo, description, website).
2. Company creates an internship listing, fills in all required fields, and submits for review.
3. Admin approves listing; it goes live on the platform.
4. Company receives in-app and email notifications as students apply.
5. Company opens the Applicants panel, reviews student profiles and CVs.
6. Company moves candidates to 'Under Review', then 'Accepted' or 'Rejected'.
7. Accepted student is notified; supervisor is also notified of the placement.

### 8.3 Supervisor: Monitor Students
1. Supervisor registers, selects Supervisor role, and links to their university and department.
2. Admin associates a cohort of students with the supervisor's account.
3. Supervisor logs in to the Monitoring Dashboard and sees all affiliated students.
4. Supervisor drills into a student's profile to see their full application history.
5. Supervisor receives a notification when a student is accepted at a company.
6. Supervisor exports a placement report for the academic department.

---

## 09 Success Metrics

The following KPIs will be tracked on an ongoing basis to evaluate platform adoption, engagement, and impact. Targets are set for 6 and 12 months post-launch.

| Metric | Target | Timeframe |
|--------|--------|-----------|
| Registered students | 500+ | 6 months post-launch |
| Registered companies | 40+ | 6 months post-launch |
| Active internship listings | 80+ | 6 months post-launch |
| Total applications submitted | 1,000+ | 6 months post-launch |
| Student-to-placement conversion rate | ≥ 25% | 6 months post-launch |
| Registered students | 2,000+ | 12 months post-launch |
| Registered companies | 120+ | 12 months post-launch |
| University partners onboarded | 5+ | 12 months post-launch |
| Average time from application to decision | ≤ 7 days | Ongoing |
| Student satisfaction score (NPS) | ≥ 40 | 12 months post-launch |
| Company return rate (re-post) | ≥ 60% | 12 months post-launch |
| Supervisor monthly active users | ≥ 80% of registered | Ongoing |

These metrics will be reviewed monthly by the product team. Dashboard analytics will be made available to supervisors and company admins in a future release.

---

InternConnect Jordan · Product Requirements Document · v1.0 · March 2026  
Confidential — For internal and stakeholder use only