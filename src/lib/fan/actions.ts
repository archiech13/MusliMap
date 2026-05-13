'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { FormState } from '@/types/database';

const VALID_RADII = [5, 10, 25, 50, 100];

export async function updateFanSettings(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'You must be logged in.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'fan') return { error: 'Only fan accounts can update these settings.' };

  const updates: Record<string, unknown> = {};

  // Location
  const locationName = (formData.get('home_location_name') as string)?.trim();
  const latRaw       = formData.get('home_lat') as string;
  const lngRaw       = formData.get('home_lng') as string;

  if (locationName && latRaw && lngRaw) {
    const lat = parseFloat(latRaw);
    const lng = parseFloat(lngRaw);
    if (!isNaN(lat) && !isNaN(lng)) {
      updates.home_location_name = locationName;
      updates.home_lat           = lat;
      updates.home_lng           = lng;
    }
  }

  // Radius
  const radiusRaw = formData.get('notification_radius_miles') as string;
  if (radiusRaw) {
    const radius = parseInt(radiusRaw, 10);
    if (VALID_RADII.includes(radius)) {
      updates.notification_radius_miles = radius;
    }
  }

  if (Object.keys(updates).length === 0) {
    return { error: 'Nothing to save — please select a location and radius.' };
  }

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/dashboard/fan');
  revalidatePath('/');
  return { message: 'Settings saved.' };
}

export async function unfollowBand(bandId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('follows')
    .delete()
    .eq('fan_id', user.id)
    .eq('band_id', bandId);

  revalidatePath('/dashboard/fan');
  revalidatePath('/');
}
