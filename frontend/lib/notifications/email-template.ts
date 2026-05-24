function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildTransactionalNotificationEmail(params: {
  appName: string;
  title: string;
  message: string;
  linkUrl: string | null;
}): { subject: string; html: string; text: string } {
  const subject = params.title.trim() || `Update from ${params.appName}`;
  const safeTitle = escapeHtml(params.title);
  const safeMessage = escapeHtml(params.message);
  const linkBlock = params.linkUrl
    ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(params.linkUrl)}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600;">View in platform</a></p>`
    : "";
  const textLink = params.linkUrl ? `\n\nOpen: ${params.linkUrl}` : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><title>${safeTitle}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#fff;border-radius:16px;border:1px solid #e2e8f0;">
        <tr><td style="padding:28px 32px 20px;background:linear-gradient(135deg,#7c3aed,#4f46e5);">
          <p style="margin:0;font-size:12px;font-weight:600;color:rgba(255,255,255,0.85);text-transform:uppercase;">${escapeHtml(params.appName)}</p>
          <h1 style="margin:10px 0 0;font-size:22px;color:#fff;">${safeTitle}</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0;font-size:15px;line-height:1.6;color:#334155;">${safeMessage}</p>
          ${linkBlock}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `${params.title}\n\n${params.message}${textLink}\n\n— ${params.appName}`;

  return { subject, html, text };
}

export function resolveAppBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
