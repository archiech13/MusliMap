import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import FanSettingsForm from '@/components/fan/FanSettingsForm';
import BandSearch from '@/components/fan/BandSearch';
import { unfollowBand } from '@/lib/fan/actions';

export default async function FanDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name, home_lat, home_lng, home_location_name, notification_radius_miles')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'fan') redirect('/dashboard/band');

  // Fetch followed bands with profile info
  const { data: follows } = await supabase
    .from('follows')
    .select('band_id')
    .eq('fan_id', user.id);

  const bandIds = (follows ?? []).map(f => f.band_id as string);

  const { data: followedBands } = bandIds.length > 0
    ? await supabase
        .from('profiles')
        .select('id, display_name, genre, avatar_url')
        .in('id', bandIds)
        .order('display_name')
    : { data: [] };

  const radius = profile?.notification_radius_miles ?? 25;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-6 py-12 max-w-3xl mx-auto w-full">

        {/* Welcome */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#FF6600] mb-2">
            Welcome back
          </p>
          <h1
            className="text-4xl text-white"
            style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            {profile?.display_name ?? 'Music Fan'}
          </h1>
          {profile?.home_location_name && (
            <p className="text-white/40 text-sm mt-1">
              📍 {profile.home_location_name} &nbsp;·&nbsp; {radius}mi radius
            </p>
          )}
        </div>

        <div className="space-y-6">

          {/* Settings card */}
          <div className="bg-[#0a0a0a] border border-white/10 p-8">
            <h2
              className="text-lg text-white mb-6"
              style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              My Settings
            </h2>
            <FanSettingsForm
              initialLocationName={profile?.home_location_name ?? ''}
              initialLat={profile?.home_lat ?? null}
              initialLng={profile?.home_lng ?? null}
              initialRadius={radius}
            />
          </div>

          {/* Explore map CTA */}
          <Link
            href="/"
            className="flex items-center justify-between p-6 bg-[#0a0a0a] border border-white/10 hover:border-[#39FF14]/40 transition-colors group"
          >
            <div className="flex items-center gap-4">
              <span className="text-2xl">🗺️</span>
              <div>
                <h2
                  className="text-base text-white"
                  style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Explore Map
                </h2>
                <p className="text-xs text-white/40 mt-0.5">Discover live gigs near you</p>
              </div>
            </div>
            <span
              className="text-xs font-bold uppercase tracking-widest text-black px-3 py-1.5 shrink-0"
              style={{ background: '#39FF14' }}
            >
              Open Map →
            </span>
          </Link>

          {/* Find Bands */}
          <div>
            <h2
              className="text-lg text-white mb-4"
              style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Find Bands
            </h2>
            <div className="bg-[#0a0a0a] border border-white/10 p-6">
              <BandSearch />
            </div>
          </div>

          {/* Following list */}
          <div>
            <h2
              className="text-lg text-white mb-4"
              style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              Following
              {followedBands && followedBands.length > 0 && (
                <span className="ml-3 text-sm text-white/30 normal-case tracking-normal" style={{ fontFamily: 'inherit' }}>
                  {followedBands.length} band{followedBands.length !== 1 ? 's' : ''}
                </span>
              )}
            </h2>

            {!followedBands || followedBands.length === 0 ? (
              <div className="border border-dashed border-white/10 p-10 flex flex-col items-center gap-3 text-center">
                <span className="text-3xl">🎸</span>
                <p className="text-white/40 text-sm">You&apos;re not following any bands yet.</p>
                <p className="text-white/25 text-xs">
                  Click &ldquo;Follow This Band&rdquo; on a gig marker or band profile.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {followedBands.map(band => (
                  <div
                    key={band.id}
                    className="flex items-center gap-4 p-4 bg-[#0a0a0a] border border-white/10"
                  >
                    {/* Avatar */}
                    <Link href={`/bands/${band.id}`} className="shrink-0">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-[#1a1a1a] border border-white/10 flex items-center justify-center hover:border-[#39FF14]/40 transition-colors">
                        {band.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={band.avatar_url} alt={band.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm">🎸</span>
                        )}
                      </div>
                    </Link>

                    {/* Info */}
                    <Link href={`/bands/${band.id}`} className="min-w-0 flex-1 group">
                      <p
                        className="text-white text-sm font-bold uppercase tracking-wide truncate group-hover:text-[#39FF14] transition-colors"
                        style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.05em' }}
                      >
                        {band.display_name}
                      </p>
                      {band.genre && (
                        <p className="text-white/40 text-xs mt-0.5">{band.genre}</p>
                      )}
                    </Link>

                    {/* Unfollow */}
                    <form action={unfollowBand.bind(null, band.id)}>
                      <button
                        type="submit"
                        className="shrink-0 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white/40 border border-white/10 hover:text-white hover:border-white/30 transition-colors"
                      >
                        Unfollow
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
