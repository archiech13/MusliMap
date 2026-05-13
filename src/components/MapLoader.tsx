'use client';

import dynamic from 'next/dynamic';
import type { Gig } from '@/types/database';

const Map = dynamic(() => import('./Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <span className="text-white/30 text-sm animate-pulse">Loading map…</span>
    </div>
  ),
});

interface Props {
  gigs: Gig[];
  fanHome?: { lat: number; lng: number; radiusMiles: number } | null;
  fanFollowedBandIds?: string[];
  isFan?: boolean;
  isLoggedIn?: boolean;
}

export default function MapLoader({ gigs, fanHome, fanFollowedBandIds, isFan, isLoggedIn }: Props) {
  return (
    <Map
      gigs={gigs}
      fanHome={fanHome ?? null}
      fanFollowedBandIds={fanFollowedBandIds ?? []}
      isFan={isFan ?? false}
      isLoggedIn={isLoggedIn ?? false}
    />
  );
}
