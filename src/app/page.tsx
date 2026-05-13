import { createClient } from '@/lib/supabase/server';
import MapLoader from '@/components/MapLoader';
import type { Gig } from '@/types/database';

export default async function Home() {
  const supabase = await createClient();

  const [gigsResult, authResult] = await Promise.all([
    supabase
      .from('gigs')
      .select('*, band:profiles!gigs_band_id_fkey(id, display_name, avatar_url)')
      .gte('starts_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('starts_at', { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const gigs: Gig[] = (gigsResult.data ?? []) as Gig[];
  const user = authResult.data.user;

  // Fan-specific map data
  let fanHome: { lat: number; lng: number; radiusMiles: number } | null = null;
  let fanFollowedBandIds: string[] = [];
  let isFan = false;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, home_lat, home_lng, notification_radius_miles')
      .eq('id', user.id)
      .single();

    if (profile?.role === 'fan') {
      isFan = true;
      if (profile.home_lat != null && profile.home_lng != null) {
        fanHome = {
          lat: profile.home_lat,
          lng: profile.home_lng,
          radiusMiles: profile.notification_radius_miles ?? 25,
        };
      }
      const { data: follows } = await supabase
        .from('follows')
        .select('band_id')
        .eq('fan_id', user.id);
      fanFollowedBandIds = (follows ?? []).map(f => f.band_id as string);
    }
  }

  return (
    <main className="flex-1 min-h-0 relative overflow-hidden">
      <MapLoader
        gigs={gigs}
        fanHome={fanHome}
        fanFollowedBandIds={fanFollowedBandIds}
        isFan={isFan}
        isLoggedIn={!!user}
      />
    </main>
  );
}
