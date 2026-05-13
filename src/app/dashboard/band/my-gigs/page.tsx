import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import GigCard from '@/components/gig/GigCard';

export default async function MyGigsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'band') redirect('/dashboard/fan');

  // Fetch this band's active gigs
  const { data: gigs } = await supabase
    .from('gigs')
    .select('*')
    .eq('band_id', user.id)
    .gte('starts_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('starts_at', { ascending: true });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-6 py-12 max-w-3xl mx-auto w-full">
        {/* Back */}
        <Link
          href="/dashboard/band"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors mb-8"
        >
          ← Dashboard
        </Link>

        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-widest text-[#39FF14] mb-2">
            {profile?.display_name}
          </p>
          <h1
            className="text-3xl text-white"
            style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            My Gigs
          </h1>
        </div>

        {!gigs || gigs.length === 0 ? (
          <div className="border border-dashed border-white/10 p-12 flex flex-col items-center gap-4 text-center">
            <span className="text-4xl">🎤</span>
            <p className="text-white/40 text-sm">No upcoming gigs yet.</p>
            <Link
              href="/dashboard/band/post-gig"
              className="px-5 py-2 text-xs font-bold uppercase tracking-widest text-black"
              style={{ background: '#39FF14' }}
            >
              Post Your First Gig →
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {gigs.map(gig => (
              <GigCard key={gig.id} gig={gig} />
            ))}

            <div className="pt-4">
              <Link
                href="/dashboard/band/post-gig"
                className="inline-block px-5 py-2 text-xs font-bold uppercase tracking-widest text-black"
                style={{ background: '#39FF14', boxShadow: '0 0 16px rgba(57,255,20,0.3)' }}
              >
                + Post Another Gig
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
