'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GENRES } from '@/lib/genres';
import type { FormState } from '@/types/database';

async function uploadAvatar(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  userId: string,
  file: File,
): Promise<{ url: string } | { error: string }> {
  const ext      = file.name.split('.').pop() ?? 'jpg';
  const filePath = `${userId}/avatar.${ext}`;

  const { data, error } = await supabase.storage
    .from('band-avatars')
    .upload(filePath, file, { contentType: file.type, upsert: true });

  if (error) return { error: `Avatar upload failed: ${error.message}` };

  const { data: { publicUrl } } = supabase.storage
    .from('band-avatars')
    .getPublicUrl(data.path);

  // Bust the CDN cache by appending a timestamp
  return { url: `${publicUrl}?t=${Date.now()}` };
}

export async function updateBandProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in.' };

  const { data: existing } = await supabase
    .from('profiles')
    .select('role, avatar_url')
    .eq('id', user.id)
    .single();

  if (existing?.role !== 'band') return { error: 'Only band accounts can edit a band profile.' };

  const displayName = (formData.get('display_name') as string)?.trim();
  const genres      = (formData.getAll('genres') as string[]).filter(g => (GENRES as readonly string[]).includes(g));
  const bio         = (formData.get('bio') as string)?.trim() || null;
  const basedIn     = (formData.get('based_in') as string)?.trim() || null;
  const avatarFile  = formData.get('avatar') as File | null;

  if (!displayName) return { error: 'Band name is required.' };
  if (!genres.length) return { error: 'Please select at least one genre.' };

  // Social links
  const socialLinks: Record<string, string> = {};
  for (const platform of ['instagram', 'spotify', 'facebook', 'website']) {
    const val = (formData.get(`social_${platform}`) as string | null)?.trim();
    if (val) socialLinks[platform] = val;
  }

  // Avatar upload
  let avatarUrl: string | null = existing?.avatar_url ?? null;
  if (avatarFile && avatarFile.size > 0) {
    const result = await uploadAvatar(supabase, user.id, avatarFile);
    if ('error' in result) return { error: result.error };
    avatarUrl = result.url;
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      display_name: displayName,
      genres,
      bio,
      based_in: basedIn,
      social_links: socialLinks,
      avatar_url: avatarUrl,
    })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/band');
  revalidatePath(`/bands/${user.id}`);
  redirect('/dashboard/band');
}
