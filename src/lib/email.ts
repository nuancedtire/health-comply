import { Resend } from "resend";

const DEFAULT_APP_URL = "https://compass.aiigent.io";

function getResend(apiKey: string) {
    return new Resend(apiKey);
}

export function resolveAppUrl(appUrl?: string): string {
    return (appUrl || DEFAULT_APP_URL).replace(/\/$/, "");
}

export function buildInvitationUrl(appUrl: string | undefined, token: string): string {
    return `${resolveAppUrl(appUrl)}/signup?token=${token}`;
}

export function buildPasswordResetUrl(appUrl: string | undefined, token: string): string {
    return `${resolveAppUrl(appUrl)}/reset-password?token=${token}`;
}

export interface InvitationEmailOptions {
    to: string;
    inviterName: string;
    organizationName: string;
    role: string;
    token: string;
    siteName?: string;
    appUrl?: string;
}

export interface PasswordResetEmailOptions {
    to: string;
    token: string;
    resetUrl?: string;
    appUrl?: string;
    userName?: string;
}

export async function sendInvitationEmail(
    apiKey: string,
    options: InvitationEmailOptions
): Promise<void> {
    const resend = getResend(apiKey);
    const signupUrl = buildInvitationUrl(options.appUrl, options.token);

    const locationText = options.siteName
        ? `${options.organizationName} – ${options.siteName}`
        : options.organizationName;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You've been invited to Compass</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#18181b;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Compass</p>
              <p style="margin:4px 0 0;font-size:12px;color:#a1a1aa;letter-spacing:0.3px;">by aiigent.io</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#18181b;">You've been invited</p>
              <p style="margin:0 0 24px;font-size:15px;color:#71717a;">
                <strong style="color:#18181b;">${escapeHtml(options.inviterName)}</strong> has invited you to join
                <strong style="color:#18181b;">${escapeHtml(locationText)}</strong> as a
                <strong style="color:#18181b;">${escapeHtml(options.role)}</strong>.
              </p>

              <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
                Compass is a CQC compliance management platform that helps healthcare teams track quality statements,
                manage evidence, and prepare for inspections.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td style="background:#18181b;border-radius:8px;">
                    <a href="${signupUrl}" style="display:block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Accept Invitation
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 32px;font-size:12px;color:#71717a;word-break:break-all;">
                <a href="${signupUrl}" style="color:#18181b;">${signupUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 24px;" />

              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                This invitation expires in <strong>7 days</strong>. If you weren't expecting this invitation, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#f4f4f5;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Compass by <a href="https://aiigent.io" style="color:#71717a;text-decoration:none;">aiigent.io</a>
                &nbsp;·&nbsp; CQC Compliance Management
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { error } = await resend.emails.send({
        from: "Compass <noreply@compass.aiigent.io>",
        to: options.to,
        subject: `You've been invited to join ${locationText} on Compass`,
        html,
    });

    if (error) {
        throw new Error(`Failed to send invitation email: ${error.message}`);
    }
}

export async function sendPasswordResetEmail(
    apiKey: string,
    options: PasswordResetEmailOptions
): Promise<void> {
    const resend = getResend(apiKey);
    const resetUrl = options.resetUrl || buildPasswordResetUrl(options.appUrl, options.token);
    const greeting = options.userName ? `Hi ${escapeHtml(options.userName)},` : "Hi,";

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset your Compass password</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e4e4e7;overflow:hidden;">
          <tr>
            <td style="background:#18181b;padding:28px 40px;">
              <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Compass</p>
              <p style="margin:4px 0 0;font-size:12px;color:#a1a1aa;letter-spacing:0.3px;">by aiigent.io</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 16px;font-size:15px;color:#71717a;">${greeting}</p>
              <p style="margin:0 0 8px;font-size:24px;font-weight:700;color:#18181b;">Reset your password</p>
              <p style="margin:0 0 24px;font-size:15px;color:#71717a;line-height:1.6;">
                Use the button below to choose a new password for your Compass account.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:32px 0;">
                <tr>
                  <td style="background:#18181b;border-radius:8px;">
                    <a href="${resetUrl}" style="display:block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:13px;color:#a1a1aa;">
                Or copy this link into your browser:
              </p>
              <p style="margin:0 0 32px;font-size:12px;color:#71717a;word-break:break-all;">
                <a href="${resetUrl}" style="color:#18181b;">${resetUrl}</a>
              </p>

              <hr style="border:none;border-top:1px solid #e4e4e7;margin:0 0 24px;" />

              <p style="margin:0;font-size:12px;color:#a1a1aa;line-height:1.6;">
                If you did not request this reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background:#f4f4f5;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#a1a1aa;">
                Compass by <a href="https://aiigent.io" style="color:#71717a;text-decoration:none;">aiigent.io</a>
                &nbsp;·&nbsp; CQC Compliance Management
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const { error } = await resend.emails.send({
        from: "Compass <noreply@compass.aiigent.io>",
        to: options.to,
        subject: "Reset your Compass password",
        html,
    });

    if (error) {
        throw new Error(`Failed to send password reset email: ${error.message}`);
    }
}

function escapeHtml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}
