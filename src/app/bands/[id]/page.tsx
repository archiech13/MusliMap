import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import FollowButton from '@/components/band/FollowButton';
import type { Profile, SocialLinks } from '@/types/database';

interface Props {
  params: Promise<{ id: string }>;
}

const SOCIAL_META: Record<string, { label: string; icon: string }> = {
  instagram: { label: 'Instagram', icon: '📸' },
  spotify:   { label: 'Spotify',   icon: '🎧' },
  facebook:  { label: 'Facebook',  icon: '📘' },
  website:   { label: 'Website',   icon: '🌐' },
};

export default async function BandProfilePage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();

  // Fetch band profile and gigs in parallel
  const [profileResult, gigsResult, authResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role, display_name, genres, bio, based_in, avatar_url, social_links')
      .eq('id', id)
      .eq('role', 'band')
      .single(),
    supabase
      .from('gigs')
      .select('id, venue_name, lat, lng, genres, starts_at, description, image_url')
      .eq('band_id', id)
      .gte('starts_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('starts_at', { ascending: true }),
    supabase.auth.getUser(),
  ]);

  if (profileResult.error || !profileResult.data) notFound();

  const band   = profileResult.data as Profile;
  const gigs   = gigsResult.data ?? [];
  const user   = authResult.data.user;

  // Determine fan follow state
  let isFan          = false;
  let isFollowing    = false;

  if (user) {
    const { data: viewerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (viewerProfile?.role === 'fan') {
      isFan = true;
      const { data: follow } = await supabase
        .from('follows')
        .select('fan_id')
        .eq('fan_id', user.id)
        .eq('band_id', id)
        .maybeSingle();
      isFollowing = !!follow;
    }
  }

  const socialLinks = (band.social_links ?? {}) as Record<string, string>;
  const hasSocials  = Object.values(socialLinks).some(v => v);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-6 py-12 max-w-3xl mx-auto w-full">

        {/* Back */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors mb-10"
        >
          ← Back to Map
        </Link>

        {/* Hero */}
        <div className="flex flex-col sm:flex-row items-start gap-6 mb-10">

          {/* Avatar */}
          <div className="shrink-0">
            {band.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={band.avatar_url}
                alt={band.display_name}
                className="w-28 h-28 rounded-full object-cover border-2 border-white/10"
                style={{ boxShadow: '0 0 0 1px rgba(57,255,20,0.2), 0 0 24px rgba(57,255,20,0.08)' }}
              />
            ) : (
              <div
                className="w-28 h-28 rounded-full bg-[#111] border-2 border-white/10 flex items-center justify-center text-4xl"
              >
                🎸
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h1
              className="text-3xl md:text-4xl text-white mb-2 leading-tight"
              style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
              {band.display_name}
            </h1>

            <div className="flex flex-wrap items-center gap-2 mb-4">
              {(band.genres ?? []).map((g: string) => (
                <span
                  key={g}
                  className="text-xs font-bold uppercase tracking-widest text-black px-2.5 py-1"
                  style={{ background: '#FF6600' }}
                >
                  {g}
                </span>
              ))}
              {band.based_in && (
                <span className="text-xs text-white/40 uppercase tracking-wider">
                  📍 {band.based_in}
                </span>
              )}
            </div>

            {/* Follow button */}
            {isFan && (
              <FollowButton bandId={band.id} initialFollowing={isFollowing} />
            )}
            {!user && (
              <Link
                href="/auth/login"
                className="inline-block px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-black"
                style={{ background: '#39FF14', boxShadow: '0 0 16px rgba(57,255,20,0.3)' }}
              >
                Sign in to Follow
              </Link>
            )}
          </div>
        </div>

        {/* Bio */}
        {band.bio && (
          <div className="mb-8">
            <h2
              className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3"
            >
              About
            </h2>
            <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
              {band.bio}
            </p>
          </div>
        )}

        {/* Social links */}
        {hasSocials && (
          <div className="mb-10">
            <h2 className="text-xs font-bold uppercase tracking-widest text-white/30 mb-3">
              Links
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(SOCIAL_META).map(([key, { label, icon }]) => {
                const url = socialLinks[key];
                if (!url) return null;
                return (
                  <a
                    key={key}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white/60 border border-white/10 hover:border-white/30 hover:text-white transition-colors"
                  >
                    <span>{icon}</span>
                    {label}
                  </a>
                );
              })}
            </div>
          </div>
        )}

        {/* Upcoming gigs */}
        <div>
          <h2
            className="text-lg text-white mb-4"
            style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Upcoming Gigs
            {gigs.length > 0 && (
              <span className="ml-3 text-sm text-white/30 normal-case tracking-normal" style={{ fontFamily: 'inherit' }}>
                {gigs.length} show{gigs.length !== 1 ? 's' : ''}
              </span>
            )}
          </h2>

          {gigs.length === 0 ? (
            <div className="border border-dashed border-white/10 p-10 text-center">
              <p className="text-white/40 text-sm">No upcoming shows.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {gigs.map(gig => {
                const date = new Date(gig.starts_at);
                return (
                  <div
                    key={gig.id}
                    className="flex gap-4 p-5 bg-[#0a0a0a] border border-white/10"
                  >
                    {gig.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={gig.image_url}
                        alt={gig.venue_name}
                        className="w-16 h-16 object-cover shrink-0"
                      />
                    )}
                    <div className="flex flex-col justify-center gap-1 min-w-0">
                      <p
                        className="text-white font-bold text-sm uppercase tracking-wide truncate"
                        style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.05em' }}
                      >
                        {gig.venue_name}
                      </p>
                      <p className="text-white/40 text-xs">
                        {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                      {gig.description && (
                        <p className="text-white/30 text-xs line-clamp-1 mt-0.5">{gig.description}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
