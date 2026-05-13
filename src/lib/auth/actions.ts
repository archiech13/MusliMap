'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { FormState, UserRole } from '@/types/database';

export async function signUpBand(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();

  const email       = formData.get('email') as string;
  const password    = formData.get('password') as string;
  const displayName = formData.get('display_name') as string;
  const genres      = formData.getAll('genres') as string[];

  const socialLinks: Record<string, string> = {};
  for (const platform of ['instagram', 'spotify', 'facebook', 'website']) {
    const val = (formData.get(`social_${platform}`) as string | null)?.trim();
    if (val) socialLinks[platform] = val;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'band' as UserRole,
        display_name: displayName,
        social_links: socialLinks,
      },
    },
  });

  if (error) return { error: error.message };

  // New band accounts start as 'pending' — requires admin approval before posting gigs.
  // Use the admin client (service role) because the user has no session yet if email
  // confirmation is required, so RLS would block a regular client update.
  if (data.user) {
    const admin = createAdminClient();
    await admin
      .from('profiles')
      .update({ status: 'pending', genres })
      .eq('id', data.user.id);
  }

  // Email confirmation required — no session yet
  if (!data.session) {
    return { message: 'Check your inbox to confirm your email, then log in.' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard/band');
}

export async function signUpFan(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();

  const email            = formData.get('email') as string;
  const password         = formData.get('password') as string;
  const displayName      = formData.get('display_name') as string;
  const homeLat          = formData.get('home_lat') as string | null;
  const homeLng          = formData.get('home_lng') as string | null;
  const homeLocationName = formData.get('home_location_name') as string | null;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'fan' as UserRole,
        display_name: displayName,
        home_lat: homeLat ?? '',
        home_lng: homeLng ?? '',
        home_location_name: homeLocationName ?? '',
      },
    },
  });

  if (error) return { error: error.message };

  if (!data.session) {
    return { message: 'Check your inbox to confirm your email, then log in.' };
  }

  revalidatePath('/', 'layout');
  redirect('/dashboard/fan');
}

export async function logIn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();

  const email    = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { error: error.message };

  // Redirect based on the user's role stored in their profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single();

  revalidatePath('/', 'layout');
  redirect(profile?.role === 'band' ? '/dashboard/band' : '/dashboard/fan');
}

export async function requestPasswordReset(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const email = (formData.get('email') as string)?.trim();

  if (!email) return { error: 'Email is required.' };

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/reset-password`,
  });

  if (error) return { error: error.message };

  // Always return success to avoid leaking which emails are registered
  return { message: "If that email is registered, you'll receive a reset link shortly." };
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/');
}
