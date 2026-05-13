import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import PostGigForm from '@/components/gig/PostGigForm';

export default async function PostGigPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, genres, role, status')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'band') redirect('/dashboard/fan');

  if (profile?.status === 'pending') {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 py-12 max-w-xl mx-auto w-full">
          <Link
            href="/dashboard/band"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors mb-8"
          >
            ← Dashboard
          </Link>
          <div
            className="p-6 border flex gap-4 items-start"
            style={{ background: 'rgba(255,102,0,0.06)', borderColor: 'rgba(255,102,0,0.35)' }}
          >
            <span className="text-2xl shrink-0">⏳</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#FF6600] mb-2">
                Approval Pending
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                Your account is under review. You&apos;ll be able to post gigs once an admin
                has approved your application.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (profile?.status === 'rejected') {
    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="px-6 py-12 max-w-xl mx-auto w-full">
          <Link
            href="/dashboard/band"
            className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors mb-8"
          >
            ← Dashboard
          </Link>
          <div
            className="p-6 border flex gap-4 items-start"
            style={{ background: 'rgba(255,50,50,0.06)', borderColor: 'rgba(255,50,50,0.35)' }}
          >
            <span className="text-2xl shrink-0">✖</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest mb-2" style={{ color: '#ff4444' }}>
                Application Unsuccessful
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                Your band application was not approved. You are unable to post gigs at this time.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-6 py-12 max-w-xl mx-auto w-full">
        {/* Back link */}
        <Link
          href="/dashboard/band"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors mb-8"
        >
          ← Dashboard
        </Link>

        {/* Heading */}
        <div className="mb-8">
          <div
            className="inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 mb-4 text-black"
            style={{ background: '#39FF14' }}
          >
            {profile?.display_name}
          </div>
          <h1
            className="text-3xl md:text-4xl text-white"
            style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            Add Your Show to the Map
          </h1>
          <p className="text-white/40 text-sm mt-2">
            Gigs appear as pins on the map and are automatically removed the day after the event.
          </p>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-8">
          <PostGigForm defaultGenres={(profile?.genres as string[] | null) ?? []} />
        </div>
      </div>
    </div>
  );
}
