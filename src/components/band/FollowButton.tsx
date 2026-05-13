'use client';

import { useState } from 'react';

interface Props {
  bandId: string;
  initialFollowing: boolean;
}

export default function FollowButton({ bandId, initialFollowing }: Props) {
  const [following, setFollowing]   = useState(initialFollowing);
  const [isPending, setIsPending]   = useState(false);

  async function toggle() {
    setIsPending(true);
    try {
      const res = await fetch('/api/follows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bandId, action: following ? 'unfollow' : 'follow' }),
      });
      if (res.ok) setFollowing(f => !f);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="px-6 py-2.5 text-sm font-bold uppercase tracking-widest transition-all disabled:opacity-50"
      style={
        following
          ? { background: 'transparent', color: '#39FF14', border: '1px solid rgba(57,255,20,0.4)' }
          : { background: '#39FF14', color: '#000', boxShadow: '0 0 16px rgba(57,255,20,0.3)' }
      }
    >
      {isPending ? '…' : following ? '★ Following' : '+ Follow This Band'}
    </button>
  );
}
