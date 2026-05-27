# Public Launch Checklist

## Required Checks

- `npm install`, `npm run lint`, `npm test`, and `npm run build` pass from `frontend/`.
- `npm run check:prod-env` passes in staging and production.
- Supabase migrations are applied through the latest production-readiness migration.
- `CRON_SECRET` is configured and sent as `x-cron-secret` by scheduled jobs.
- `/api/health` is monitored by an uptime checker.
- Email diagnostic endpoints return `401` unauthenticated and `403` for non-admin users.
- A non-admin user cannot update `profiles.role` or `profiles.is_suspended`.
- The maintenance cron returns counts for processed, failed, and skipped email rows.
- AI and email endpoints use shared rate limiting in production.
- Staging has the same Supabase/Auth redirect URLs and required env vars as production.

## Smoke Flows

- Student signup, onboarding, internship browse, apply, commit, monthly report, and CV upload.
- Company signup, onboarding request approval, internship posting, application review, and CV access.
- Supervisor login, same-department student review, and report evaluation.
- Admin login, onboarding approvals, user suspension, email diagnostics, and dashboard access.

## Staging

- Use a separate Supabase project for staging.
- Configure staging Auth redirect URLs to the staging domain.
- Run migrations against staging before production.
- Use test email credentials or a sandbox sender.
- Run the smoke flows with dedicated staging accounts for student, company, supervisor, and admin.

## Observability

- Add an external uptime monitor for `/api/health` and the public home page.
- Forward structured JSON logs from Vercel to a log provider such as Axiom, Logtail, Datadog, or similar.
- Add Sentry or another error tracker before public beta for frontend and route-handler exceptions.
- Review OpenAI usage daily during beta and set provider-side budget alerts.

## Rollback

- Keep the previous deployed build available in Vercel.
- Do not remove old database columns during public launch hardening.
- If cron jobs fail repeatedly, disable the Vercel cron and manually run the maintenance endpoint with `CRON_SECRET`.
- If email delivery fails, inspect `transactional_email_queue.last_error` and stop retrying rows at the dead-letter threshold.
