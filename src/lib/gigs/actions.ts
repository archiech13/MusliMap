'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { sendGigNotifications } from '@/lib/email/send-gig-notifications';
import { GENRES } from '@/lib/genres';
import type { FormState } from '@/types/database';

// ── Shared helpers ──────────────────────────────────────────

async function getBandUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: 'You must be logged in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'band') {
    return { supabase, user: null, error: 'Only band accounts can manage gigs.' };
  }

  if (profile.status === 'pending') {
    return { supabase, user: null, error: 'Your account is pending approval. You will be able to post gigs once an admin has reviewed your application.' };
  }

  if (profile.status === 'rejected') {
    return { supabase, user: null, error: 'Your account application was unsuccessful.' };
  }

  return { supabase, user, error: null };
}

function validateDates(startsAt: string): string | null {
  const gigDate = new Date(startsAt);
  const now     = new Date();
  const maxDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  if (isNaN(gigDate.getTime())) return 'Invalid date.';
  if (gigDate <= now)           return 'Gig date must be in the future.';
  if (gigDate > maxDate)        return 'Gig date must be within 14 days from now.';
  return null;
}

async function uploadImage(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  userId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  const ext      = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${userId}/${Date.now()}.${ext}`;

  const { data, error } = await supabase.storage
    .from('gig-images')
    .upload(filePath, file, { contentType: file.type, upsert: false });

  if (error) return { error: `Image upload failed: ${error.message}` };

  const { data: { publicUrl } } = supabase.storage
    .from('gig-images')
    .getPublicUrl(data.path);

  return { url: publicUrl };
}

// ── Post gig ────────────────────────────────────────────────

export async function postGig(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user, error: authError } = await getBandUser();
  if (authError || !user) return { error: authError ?? 'Unauthorized.' };

  const venueName   = (formData.get('venue_name') as string)?.trim();
  const latRaw      = formData.get('lat') as string;
  const lngRaw      = formData.get('lng') as string;
  const startsAt    = formData.get('starts_at') as string;
  const genres      = (formData.getAll('genres') as string[]).filter(g => (GENRES as readonly string[]).includes(g));
  const description = (formData.get('description') as string)?.trim() || null;
  const imageFile   = formData.get('image') as File | null;

  if (!venueName)         return { error: 'Venue name is required.' };
  if (!latRaw || !lngRaw) return { error: 'Please select a venue location from the search results.' };
  if (!startsAt)          return { error: 'Date and time are required.' };
  if (!genres.length)     return { error: 'Please select at least one genre.' };

  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);
  if (isNaN(lat) || isNaN(lng)) return { error: 'Invalid location coordinates.' };

  const dateError = validateDates(startsAt);
  if (dateError) return { error: dateError };

  let imageUrl: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const result = await uploadImage(supabase, user.id, imageFile);
    if ('error' in result) return { error: result.error };
    imageUrl = result.url;
  }

  const { error: insertError } = await supabase.from('gigs').insert({
    band_id: user.id, venue_name: venueName, lat, lng,
    genres, starts_at: startsAt, description, image_url: imageUrl,
  });

  if (insertError) return { error: insertError.message };

  // Send gig notifications (fire-and-catch — never blocks the redirect on failure)
  try {
    const { data: band } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', user.id)
      .single();

    await sendGigNotifications({
      bandId:      user.id,
      bandName:    band?.display_name ?? 'A band',
      venueName,
      lat,
      lng,
      startsAt,
      genres,
      description: description ?? null,
      imageUrl:    imageUrl,
    });
  } catch (err) {
    // Log but don't surface email errors to the user
    console.error('[gig-notifications] Failed to send emails:', err);
  }

  revalidatePath('/');
  revalidatePath('/dashboard/band');
  revalidatePath('/dashboard/band/my-gigs');
  redirect('/dashboard/band/my-gigs');
}

// ── Update gig ──────────────────────────────────────────────

export async function updateGig(
  gigId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const { supabase, user, error: authError } = await getBandUser();
  if (authError || !user) return { error: authError ?? 'Unauthorized.' };

  // Verify ownership
  const { data: existing } = await supabase
    .from('gigs')
    .select('band_id, image_url')
    .eq('id', gigId)
    .single();

  if (!existing)                    return { error: 'Gig not found.' };
  if (existing.band_id !== user.id) return { error: 'You can only edit your own gigs.' };

  const venueName   = (formData.get('venue_name') as string)?.trim();
  const latRaw      = formData.get('lat') as string;
  const lngRaw      = formData.get('lng') as string;
  const startsAt    = formData.get('starts_at') as string;
  const genres      = (formData.getAll('genres') as string[]).filter(g => (GENRES as readonly string[]).includes(g));
  const description = (formData.get('description') as string)?.trim() || null;
  const imageFile   = formData.get('image') as File | null;

  if (!venueName)         return { error: 'Venue name is required.' };
  if (!latRaw || !lngRaw) return { error: 'Venue location is required.' };
  if (!startsAt)          return { error: 'Date and time are required.' };
  if (!genres.length)     return { error: 'Please select at least one genre.' };

  const lat = parseFloat(latRaw);
  const lng = parseFloat(lngRaw);
  if (isNaN(lat) || isNaN(lng)) return { error: 'Invalid location coordinates.' };

  const dateError = validateDates(startsAt);
  if (dateError) return { error: dateError };

  // Use existing image unless a new one is uploaded
  let imageUrl: string | null = existing.image_url;
  if (imageFile && imageFile.size > 0) {
    const result = await uploadImage(supabase, user.id, imageFile);
    if ('error' in result) return { error: result.error };
    imageUrl = result.url;
  }

  const { error: updateError } = await supabase
    .from('gigs')
    .update({ venue_name: venueName, lat, lng, genres, starts_at: startsAt, description, image_url: imageUrl })
    .eq('id', gigId)
    .eq('band_id', user.id);

  if (updateError) return { error: updateError.message };

  revalidatePath('/');
  revalidatePath('/dashboard/band/my-gigs');
  redirect('/dashboard/band/my-gigs');
}

// ── Delete gig ──────────────────────────────────────────────

export async function deleteGig(gigId: string): Promise<void> {
  const { supabase, user } = await getBandUser();
  if (!user) return;

  await supabase
    .from('gigs')
    .delete()
    .eq('id', gigId)
    .eq('band_id', user.id); // RLS also enforces this

  revalidatePath('/');
  revalidatePath('/dashboard/band/my-gigs');
  redirect('/dashboard/band/my-gigs');
}
