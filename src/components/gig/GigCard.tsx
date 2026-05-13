'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { deleteGig } from '@/lib/gigs/actions';
import type { Gig } from '@/types/database';

interface Props {
  gig: Gig;
}

export default function GigCard({ gig }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const date = new Date(gig.starts_at);

  function handleDelete() {
    startTransition(async () => {
      await deleteGig(gig.id);
    });
  }

  return (
    <>
      <div className="flex gap-4 p-5 bg-[#0a0a0a] border border-white/10">
        {gig.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={gig.image_url}
            alt={gig.venue_name}
            className="w-20 h-20 object-cover shrink-0"
          />
        )}
        <div className="flex flex-col justify-between gap-1 min-w-0 flex-1">
          <div>
            <p
              className="text-white font-bold text-sm uppercase tracking-wide truncate"
              style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.05em' }}
            >
              {gig.venue_name}
            </p>
            <p className="text-white/40 text-xs mt-0.5">
              {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          {gig.genres?.length > 0 && (
            <div className="flex flex-wrap gap-1 self-start">
              {gig.genres.map(g => (
                <span
                  key={g}
                  className="text-xs font-bold uppercase tracking-widest text-black px-2 py-0.5"
                  style={{ background: '#FF6600' }}
                >
                  {g}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2 shrink-0 justify-start">
          <Link
            href={`/dashboard/band/my-gigs/${gig.id}/edit`}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white border border-white/20 hover:border-white/50 transition-colors text-center"
          >
            Edit
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-[#FF6600] border border-[#FF6600]/30 hover:border-[#FF6600] transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Confirmation modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-[#0a0a0a] border border-white/10 p-8 max-w-sm w-full">
            <h2
              className="text-xl text-white mb-2"
              style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
            >
              Delete Gig?
            </h2>
            <p className="text-white/40 text-sm mb-1 truncate">{gig.venue_name}</p>
            <p className="text-white/25 text-xs mb-6">
              {date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}
              {date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
            </p>
            <p className="text-white/50 text-sm mb-8">
              This will permanently remove the gig from the map. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                disabled={isPending}
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest text-white/60 border border-white/10 hover:border-white/30 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="flex-1 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors disabled:opacity-40"
                style={{ background: '#FF6600' }}
              >
                {isPending ? 'Deleting…' : 'Delete Gig'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
