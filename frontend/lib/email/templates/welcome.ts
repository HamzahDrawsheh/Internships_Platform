export function buildWelcomeEmailHtml(params: {
  recipientName: string | null;
  appName: string;
}): string {
  const greeting = params.recipientName?.trim()
    ? `Hi ${escapeHtml(params.recipientName.trim())},`
    : "Hi there,";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Welcome</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8fafc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);">
              <p style="margin:0;font-size:13px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:rgba(255,255,255,0.85);">${escapeHtml(params.appName)}</p>
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#ffffff;">Welcome aboard</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#0f172a;">${greeting}</p>
              <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155;">
                Thank you for joining ${escapeHtml(params.appName)}. Your account has been created successfully.
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#334155;">
                Please check your inbox for a separate message to confirm your email address, then sign in to explore internships, manage applications, and stay updated.
              </p>
              <p style="margin:0;font-size:14px;line-height:1.6;color:#64748b;">
                If you did not create this account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #e2e8f0;background:#f8fafc;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#94a3b8;text-align:center;">
                &copy; ${new Date().getFullYear()} ${escapeHtml(params.appName)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildWelcomeEmailText(params: {
  recipientName: string | null;
  appName: string;
}): string {
  const greeting = params.recipientName?.trim()
    ? `Hi ${params.recipientName.trim()},`
    : "Hi there,";

  return `${greeting}

Thank you for joining ${params.appName}. Your account has been created successfully.

Please check your inbox for a separate message to confirm your email address, then sign in to explore internships and manage your applications.

If you did not create this account, you can safely ignore this email.

— ${params.appName}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
