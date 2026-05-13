import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import EditGigForm from '@/components/gig/EditGigForm';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditGigPage({ params }: Props) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'band') redirect('/dashboard/fan');

  const { data: gig } = await supabase
    .from('gigs')
    .select('*')
    .eq('id', id)
    .eq('band_id', user.id)
    .single();

  if (!gig) notFound();

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-6 py-12 max-w-xl mx-auto w-full">
        {/* Back */}
        <Link
          href="/dashboard/band/my-gigs"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors mb-8"
        >
          ← My Gigs
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
            Edit Gig
          </h1>
          <p className="text-white/40 text-sm mt-2">
            Update the details for your upcoming show.
          </p>
        </div>

        <div className="bg-[#0a0a0a] border border-white/10 p-8">
          <EditGigForm gig={gig} />
        </div>
      </div>
    </div>
  );
}
