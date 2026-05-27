const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OPENAI_API_KEY",
  "CRON_SECRET",
];

const siteUrlPresent = Boolean(
  process.env.NEXT_PUBLIC_APP_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim()
);

const emailConfigured = Boolean(
  process.env.RESEND_API_KEY?.trim() ||
    (process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_PORT?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim())
);

const missing = required.filter((key) => !process.env[key]?.trim());

if (!siteUrlPresent) {
  missing.push("NEXT_PUBLIC_APP_URL or NEXT_PUBLIC_SITE_URL");
}

if (!emailConfigured) {
  missing.push("RESEND_API_KEY or complete SMTP_* configuration");
}

if (missing.length > 0) {
  console.error("Missing production environment configuration:");
  for (const key of missing) {
    console.error(`- ${key}`);
  }
  process.exit(1);
}

console.log("Production environment configuration looks complete.");
