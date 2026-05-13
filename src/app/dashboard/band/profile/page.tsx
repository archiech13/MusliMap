import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BandProfileForm from '@/components/band/BandProfileForm';

export default async function BandProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  // Role check uses only columns that exist from migration 001/002.
  // This is kept separate so a failed extended-profile query can never
  // cause an incorrect redirect.
  const { data: authProfile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single();

  if (authProfile?.role !== 'band') redirect('/dashboard/fan');

  // Extended fields added by migration 004 (avatar_url, based_in).
  // If that migration hasn't been run yet the query returns null — we
  // fall back to empty defaults so the page still renders.
  const { data: profile } = await supabase
    .from('profiles')
    .select('genres, bio, based_in, avatar_url, social_links')
    .eq('id', user.id)
    .single();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-6 py-12 max-w-xl mx-auto w-full">

        <Link
          href="/dashboard/band"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors mb-8"
        >
          ← Dashboard
        </Link>

        <div className="mb-8">
          <div
            className="inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 mb-4 text-black"
            style={{ background: '#FF6600' }}
          >
            {authProfile?.display_name}
          </div>
          <h1
            className="text-3xl md:text-4xl text-white"
            style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            Edit Profile
          </h1>
          <p className="text-white/40 text-sm mt-2">
            Your public profile is visible to all fans on the map.
          </p>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-8">
          <BandProfileForm
            profile={{
              display_name:  authProfile?.display_name ?? '',
              genres:        (profile?.genres as string[] | null) ?? [],
              bio:           profile?.bio ?? null,
              based_in:      profile?.based_in ?? null,
              avatar_url:    profile?.avatar_url ?? null,
              social_links:  profile?.social_links ?? {},
            }}
          />
        </div>

      </div>
    </div>
  );
}
