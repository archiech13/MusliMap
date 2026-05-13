'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendApprovalEmail, sendRejectionEmail } from '@/lib/email/send-application-email';

async function requireAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) throw new Error('ADMIN_EMAIL environment variable is not set.');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== adminEmail) redirect('/');
  return user;
}

/** Fetch a band's display_name and auth email using the admin client. */
async function getBandDetails(bandId: string): Promise<{ displayName: string; email: string } | null> {
  const admin = createAdminClient();

  const [profileResult, userResult] = await Promise.all([
    admin.from('profiles').select('display_name').eq('id', bandId).single(),
    admin.auth.admin.getUserById(bandId),
  ]);

  const displayName = profileResult.data?.display_name as string | undefined;
  const email       = userResult.data.user?.email;

  if (!displayName || !email) return null;
  return { displayName, email };
}

export async function approveBand(bandId: string): Promise<void> {
  await requireAdmin();

  const admin = createAdminClient();
  await admin
    .from('profiles')
    .update({ status: 'approved' })
    .eq('id', bandId)
    .eq('role', 'band');

  try {
    const details = await getBandDetails(bandId);
    if (details) {
      await sendApprovalEmail(details.email, details.displayName);
    }
  } catch (err) {
    console.error('[admin] Failed to send approval email:', err);
  }

  revalidatePath('/admin');
}

export async function rejectBand(bandId: string): Promise<void> {
  await requireAdmin();

  const admin = createAdminClient();
  await admin
    .from('profiles')
    .update({ status: 'rejected' })
    .eq('id', bandId)
    .eq('role', 'band');

  try {
    const details = await getBandDetails(bandId);
    if (details) {
      await sendRejectionEmail(details.email, details.displayName);
    }
  } catch (err) {
    console.error('[admin] Failed to send rejection email:', err);
  }

  revalidatePath('/admin');
}
