'use server';

import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/admin';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.RESEND_FROM_EMAIL ?? 'Musli Map <notifications@muslimap.com>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://muslimap.com';

// ── Geo helpers ───────────────────────────────────────────────

function haversineDistanceMiles(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Email template ────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit', minute: '2-digit',
  });
}

function buildEmailHtml(opts: {
  bandName: string;
  venueName: string;
  startsAt: string;
  genres: string[];
  description: string | null;
  imageUrl: string | null;
}): string {
  const { bandName, venueName, startsAt, genres, description, imageUrl } = opts;
  const dateStr = formatDate(startsAt);
  const timeStr = formatTime(startsAt);

  const imageBlock = imageUrl ? `
    <img src="${imageUrl}" alt="Gig image"
      style="width:100%;max-height:260px;object-fit:cover;display:block;border-bottom:1px solid #1f1f1f;" />
  ` : '';

  const genreBlock = genres.length > 0 ? `
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:20px;">
      ${genres.map(g => `<span style="
        display:inline-block;
        background:#39FF14;
        color:#0a0a0a;
        font-size:11px;
        font-weight:700;
        letter-spacing:0.1em;
        text-transform:uppercase;
        padding:3px 10px;
        border-radius:999px;
      ">${g}</span>`).join('')}
    </div>
  ` : '';

  const descBlock = description ? `
    <p style="font-size:14px;color:#999;line-height:1.7;margin:16px 0 0;">${description}</p>
  ` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>New gig from ${bandName}</title>
</head>
<body style="margin:0;padding:0;background:#080808;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080808;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0">

          <!-- Logo / wordmark -->
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
              ${imageBlock}
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:28px 28px 8px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#39FF14;">
                      New Gig Alert
                    </p>
                    <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#fff;line-height:1.2;">
                      ${bandName}
                    </h1>
                    ${genreBlock}

                    <!-- Info rows -->
                    <table cellpadding="0" cellspacing="0" style="width:100%;margin-bottom:8px;">
                      <tr>
                        <td style="padding:10px 0;border-top:1px solid #1f1f1f;">
                          <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#555;display:block;margin-bottom:3px;">Venue</span>
                          <span style="font-size:15px;font-weight:600;color:#e5e5e5;">📍 ${venueName}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-top:1px solid #1f1f1f;">
                          <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#555;display:block;margin-bottom:3px;">Date</span>
                          <span style="font-size:15px;font-weight:600;color:#e5e5e5;">🗓 ${dateStr}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:10px 0;border-top:1px solid #1f1f1f;">
                          <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#555;display:block;margin-bottom:3px;">Time</span>
                          <span style="font-size:15px;font-weight:600;color:#e5e5e5;">🕗 ${timeStr}</span>
                        </td>
                      </tr>
                    </table>

                    ${descBlock}
                  </td>
                </tr>
                <tr>
                  <td style="padding:20px 28px 28px;">
                    <a href="${APP_URL}"
                      style="
                        display:block;
                        text-align:center;
                        background:#39FF14;
                        color:#0a0a0a;
                        font-size:13px;
                        font-weight:800;
                        letter-spacing:0.1em;
                        text-transform:uppercase;
                        text-decoration:none;
                        padding:14px 24px;
                        border-radius:6px;
                      ">
                      View on Musli Map →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 0 0;text-align:center;">
              <p style="margin:0;font-size:12px;color:#444;line-height:1.6;">
                You're receiving this because you use Musli Map.<br />
                <a href="${APP_URL}" style="color:#555;text-decoration:underline;">Visit Musli Map</a>
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

// ── Main export ───────────────────────────────────────────────

export interface GigNotificationPayload {
  bandId: string;
  bandName: string;
  venueName: string;
  lat: number;
  lng: number;
  startsAt: string;
  genres: string[];
  description: string | null;
  imageUrl: string | null;
}

export async function sendGigNotifications(gig: GigNotificationPayload): Promise<void> {
  console.log(`[gig-notifications] Starting for band "${gig.bandName}" (${gig.bandId}), venue: "${gig.venueName}" [${gig.lat}, ${gig.lng}]`);

  const admin = createAdminClient();

  // 1. Fans who follow this band
  const { data: follows, error: followsError } = await admin
    .from('follows')
    .select('fan_id')
    .eq('band_id', gig.bandId);

  if (followsError) {
    console.error('[gig-notifications] Error fetching followers:', followsError.message);
  }
  const followerIds = new Set<string>((follows ?? []).map(f => f.fan_id as string));
  console.log(`[gig-notifications] Followers found: ${followerIds.size}`);

  // 2. Fans whose home location is within their notification radius of the venue
  const { data: nearbyFanProfiles, error: nearbyError } = await admin
    .from('profiles')
    .select('id, home_lat, home_lng, notification_radius_miles')
    .eq('role', 'fan')
    .not('home_lat', 'is', null)
    .not('home_lng', 'is', null)
    .not('notification_radius_miles', 'is', null);

  if (nearbyError) {
    console.error('[gig-notifications] Error fetching fan profiles:', nearbyError.message);
  }
  console.log(`[gig-notifications] Fan profiles with home location: ${(nearbyFanProfiles ?? []).length}`);

  const nearbyIds = new Set<string>();
  for (const fan of nearbyFanProfiles ?? []) {
    const dist = haversineDistanceMiles(
      fan.home_lat as number,
      fan.home_lng as number,
      gig.lat,
      gig.lng,
    );
    if (dist <= (fan.notification_radius_miles as number)) {
      nearbyIds.add(fan.id as string);
    }
  }
  console.log(`[gig-notifications] Fans within radius: ${nearbyIds.size}`);

  // 3. Union of both sets (deduplication is automatic via Set)
  const recipientIds = new Set([...followerIds, ...nearbyIds]);
  console.log(`[gig-notifications] Total unique recipients: ${recipientIds.size}`);

  if (recipientIds.size === 0) {
    console.log('[gig-notifications] No recipients — skipping send.');
    return;
  }

  // 4. Fetch emails from auth.users via admin API
  const emailsByUserId = new Map<string, string>();
  await Promise.all(
    [...recipientIds].map(async (fanId) => {
      const { data, error } = await admin.auth.admin.getUserById(fanId);
      if (error) {
        console.error(`[gig-notifications] Could not fetch user ${fanId}:`, error.message);
      } else if (data.user?.email) {
        emailsByUserId.set(fanId, data.user.email);
      } else {
        console.warn(`[gig-notifications] User ${fanId} has no email address.`);
      }
    }),
  );
  console.log(`[gig-notifications] Emails resolved: ${emailsByUserId.size} of ${recipientIds.size} recipients`);

  if (emailsByUserId.size === 0) {
    console.log('[gig-notifications] No emails to send after lookup — skipping.');
    return;
  }

  // 5. Build email content once (same for all recipients)
  const html = buildEmailHtml({
    bandName: gig.bandName,
    venueName: gig.venueName,
    startsAt: gig.startsAt,
    genres: gig.genres,
    description: gig.description,
    imageUrl: gig.imageUrl,
  });

  const subject = `${gig.bandName} is playing near you — ${formatDate(gig.startsAt)}`;

  const testTo = process.env.RESEND_TEST_TO ?? null;
  if (testTo) {
    console.log(`[gig-notifications] RESEND_TEST_TO is set — all emails redirected to: ${testTo}`);
  }

  console.log(`[gig-notifications] FROM: ${FROM}`);
  console.log(`[gig-notifications] Subject: "${subject}"`);

  // 6. Send in batches of 100 (Resend batch limit)
  const actualEmails = [...emailsByUserId.values()];
  const BATCH = 100;

  for (let i = 0; i < actualEmails.length; i += BATCH) {
    const batch = actualEmails.slice(i, i + BATCH).map(to => ({
      from: FROM,
      to: testTo ?? to,
      subject,
      html,
    }));

    console.log(`[gig-notifications] Sending batch ${Math.floor(i / BATCH) + 1} (${batch.length} emails) — actual recipient(s): ${actualEmails.slice(i, i + BATCH).join(', ')} — delivered to: ${batch.map(b => b.to).join(', ')}`);
    const { data: batchData, error: batchError } = await resend.batch.send(batch);

    if (batchError) {
      console.error('[gig-notifications] Resend batch error:', JSON.stringify(batchError, Object.getOwnPropertyNames(batchError)));
    } else {
      console.log('[gig-notifications] Resend batch success:', JSON.stringify(batchData));
    }
  }

  console.log('[gig-notifications] Done.');
}
