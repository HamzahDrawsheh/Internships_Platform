# BUG TRACKING DOCUMENT
## InternConnect Jordan
### Issue Tracking & Debugging Log

---

**Version**  
1.0 — MVP

**Date**  
March 4, 2026

**Audience**  
Engineering Team · QA · Developers

---

# 01 Purpose

This document is used to track bugs, issues, and unexpected behavior during development of the InternConnect Jordan platform.

Each bug entry should include:

- Bug ID
- Description
- Severity
- Status
- Steps to reproduce
- Expected behavior
- Actual behavior
- Assigned developer
- Fix notes

This helps the development team systematically identify, prioritize, and resolve issues.

---

# 02 Severity Levels

| Level | Meaning |
|------|--------|
| Critical | System cannot function or major feature broken |
| High | Core functionality affected |
| Medium | Feature works but with issues |
| Low | Minor UI or usability issue |

---

# 03 Status Types

| Status | Meaning |
|------|--------|
| Open | Bug discovered but not fixed |
| In Progress | Developer working on fix |
| Fixed | Bug resolved |
| Testing | Fix implemented, awaiting verification |
| Closed | Verified and resolved |

---

# 04 Bug Log Table

| Bug ID | Page / Module | Description | Severity | Status | Assigned To |
|------|---------------|-------------|----------|--------|-------------|
| BUG-001 | Login Page | User cannot login with valid credentials | Critical | Open | Backend |
| BUG-002 | Internship Listing | Filters do not update results correctly | Medium | Open | Frontend |
| BUG-003 | Application Flow | Duplicate applications allowed | High | Open | Backend |
| BUG-004 | Company Dashboard | Applicants count incorrect | Medium | Open | Backend |
| BUG-005 | Profile Page | CV upload fails for files >3MB | Low | Open | Backend |

---

# 05 Bug Report Template

Use the following template when reporting a new bug.

```
Bug ID:
BUG-XXX

Page / Module:
Example: Internship Details Page

Description:
Short description of the issue.

Steps to Reproduce:
1. Go to page
2. Perform action
3. Observe behavior

Expected Behavior:
What should happen.

Actual Behavior:
What actually happens.

Severity:
Critical / High / Medium / Low

Status:
Open

Assigned To:
Developer responsible

Notes:
Optional debugging notes
```

---

# 06 Common Debug Areas

During development, most issues are expected to appear in the following areas.

### Authentication
- Session not detected
- Supabase JWT validation failure
- Role mismatch

### API Requests
- Incorrect endpoint response
- Authorization errors
- Validation errors

### Database
- RLS policies blocking queries
- Incorrect joins
- Missing indexes

### File Uploads
- CV upload errors
- Supabase Storage permissions
- Signed URL generation

### UI Issues
- Incorrect state rendering
- Broken navigation
- Layout bugs

---

# 07 Debugging Workflow

1. Developer identifies or receives bug report.
2. Bug is logged in the bug table.
3. Severity is assigned.
4. Developer begins investigation.
5. Fix implemented.
6. Fix tested locally.
7. Bug status updated to "Testing".
8. QA verifies fix.
9. Bug status changed to "Closed".

---

# 08 Testing Checklist Before Deployment

Before deploying the MVP version, the following flows must be tested.

### Authentication
- Signup
- Email verification
- Login
- Logout

### Student Flow
- Browse internships
- Apply to internship
- View application status

### Company Flow
- Create internship
- View applicants
- Accept / Reject applications

### Supervisor Flow
- View students
- View application history

### Admin Flow
- Suspend users
- Approve internships
- View analytics

---

InternConnect Jordan · Bug Tracking Document · v1.0 · March 2026  
Internal Engineering Document