'use server';

import { Resend } from 'resend';

const resend  = new Resend(process.env.RESEND_API_KEY);
const FROM    = process.env.RESEND_FROM_EMAIL ?? 'Musli Map <notifications@muslimap.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://muslimap.com';

// ── Shared shell ──────────────────────────────────────────────

function shell(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">

          <!-- Wordmark -->
          <tr>
            <td style="padding-bottom:32px;text-align:center;">
              <span style="font-size:22px;font-weight:800;letter-spacing:-0.5px;color:#fff;">
                MUSLI <span style="color:#39FF14;">MAP</span>
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#111;border:1px solid #1f1f1f;border-radius:12px;overflow:hidden;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="padding:32px 28px 28px;">${body}</td></tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
                <a href="${APP_URL}" style="color:#555;text-decoration:underline;">muslimap.com</a>
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

// ── Approval email ────────────────────────────────────────────

function approvalHtml(bandName: string): string {
  const body = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#39FF14;">
      Application Approved
    </p>
    <h1 style="margin:0 0 24px;font-size:24px;font-weight:800;color:#fff;line-height:1.2;">
      You're on the map, ${bandName}! 🎸
    </h1>

    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.7;">
      Great news — your Musli Map application has been approved. You can now log in and
      start posting your upcoming gigs directly onto the map for fans nearby to discover.
    </p>

    <p style="margin:0 0 28px;font-size:15px;color:#ccc;line-height:1.7;">
      Every gig you post will appear as a pin on the map and trigger email notifications
      to fans in your area and anyone already following your band.
    </p>

    <a href="${APP_URL}/auth/login"
      style="
        display:inline-block;
        background:#39FF14;
        color:#0a0a0a;
        font-size:13px;
        font-weight:800;
        letter-spacing:0.1em;
        text-transform:uppercase;
        text-decoration:none;
        padding:14px 28px;
        border-radius:6px;
      ">
      Log In &amp; Post Your First Gig →
    </a>
  `;
  return shell("You're approved — Musli Map", body);
}

// ── Rejection email ───────────────────────────────────────────

function rejectionHtml(bandName: string): string {
  const body = `
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#888;">
      Application Update
    </p>
    <h1 style="margin:0 0 24px;font-size:24px;font-weight:800;color:#fff;line-height:1.2;">
      Hi ${bandName},
    </h1>

    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.7;">
      Thank you for applying to join Musli Map. After reviewing your application,
      we're unable to approve it at this time.
    </p>

    <p style="margin:0 0 16px;font-size:15px;color:#ccc;line-height:1.7;">
      This doesn't mean the door is permanently closed — you're welcome to update
      your profile and reapply in the future. We review all applications carefully
      and appreciate you taking the time to sign up.
    </p>

    <p style="margin:0 0 28px;font-size:15px;color:#ccc;line-height:1.7;">
      If you have any questions, feel free to reach out to us directly.
    </p>

    <a href="${APP_URL}"
      style="
        display:inline-block;
        background:#222;
        color:#fff;
        font-size:13px;
        font-weight:800;
        letter-spacing:0.1em;
        text-transform:uppercase;
        text-decoration:none;
        padding:14px 28px;
        border-radius:6px;
        border:1px solid #333;
      ">
      Visit Musli Map
    </a>
  `;
  return shell('Musli Map application update', body);
}

// ── Exports ───────────────────────────────────────────────────

export async function sendApprovalEmail(to: string, bandName: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: "You're on the map — Musli Map application approved",
    html: approvalHtml(bandName),
  });
  if (error) {
    console.error('[application-email] Approval send error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  }
}

export async function sendRejectionEmail(to: string, bandName: string): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to,
    subject: 'Musli Map application update',
    html: rejectionHtml(bandName),
  });
  if (error) {
    console.error('[application-email] Rejection send error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  }
}
