import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function BandDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, genres, status')
    .eq('id', user.id)
    .single();

  const status = profile?.status ?? 'approved';
  const isApproved = status === 'approved';

  const allCards = [
    {
      label: 'Post a Gig',
      description: 'Add an upcoming show to the map.',
      accent: '#39FF14',
      icon: '📍',
      href: '/dashboard/band/post-gig',
      live: true,
      requiresApproval: true,
    },
    {
      label: 'My Gigs',
      description: 'Manage your upcoming listings.',
      accent: '#39FF14',
      icon: '🎤',
      href: '/dashboard/band/my-gigs',
      live: true,
      requiresApproval: true,
    },
    {
      label: 'Followers',
      description: 'See fans following your band.',
      accent: '#FF6600',
      icon: '👥',
      href: null,
      live: false,
      requiresApproval: false,
    },
    {
      label: 'Profile',
      description: 'Update your bio, photo and social links.',
      accent: '#FF6600',
      icon: '✏️',
      href: '/dashboard/band/profile',
      live: true,
      requiresApproval: false,
    },
  ];

  // Hide gig-related cards for non-approved bands
  const cards = isApproved
    ? allCards
    : allCards.filter(c => !c.requiresApproval);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-6 py-12 max-w-3xl mx-auto w-full">
        {/* Welcome */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#39FF14] mb-2">
            Welcome back
          </p>
          <h1
            className="text-4xl text-white"
            style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            {profile?.display_name ?? 'Your Band'}
          </h1>
          {(profile?.genres as string[] | null | undefined)?.length ? (
            <p className="text-white/40 text-sm mt-1">
              {(profile?.genres as string[]).join(' · ')}
            </p>
          ) : null}
        </div>

        {/* Status banners */}
        {status === 'pending' && (
          <div
            className="mb-8 p-5 border flex gap-4 items-start"
            style={{ background: 'rgba(255,102,0,0.06)', borderColor: 'rgba(255,102,0,0.35)' }}
          >
            <span className="text-xl shrink-0">⏳</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest text-[#FF6600] mb-1">
                Application Under Review
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                Your band account is being reviewed by our team. You&apos;ll be able to post gigs
                to the map as soon as you&apos;re approved. This usually takes less than 24 hours.
              </p>
            </div>
          </div>
        )}

        {status === 'rejected' && (
          <div
            className="mb-8 p-5 border flex gap-4 items-start"
            style={{ background: 'rgba(255,50,50,0.06)', borderColor: 'rgba(255,50,50,0.35)' }}
          >
            <span className="text-xl shrink-0">✖</span>
            <div>
              <p className="text-sm font-bold uppercase tracking-widest mb-1" style={{ color: '#ff4444' }}>
                Application Unsuccessful
              </p>
              <p className="text-sm text-white/50 leading-relaxed">
                Unfortunately your band application was not approved at this time.
                If you think this is a mistake, please get in touch with us.
              </p>
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-5">
          {cards.map(({ label, description, accent, icon, href, live }) => {
            const inner = (
              <>
                <span className="text-2xl" aria-hidden>{icon}</span>
                <div>
                  <h2
                    className="text-base text-white mb-1"
                    style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                  >
                    {label}
                  </h2>
                  <p className="text-xs text-white/40">{description}</p>
                </div>
                <span
                  className="mt-auto self-start text-xs font-bold uppercase tracking-widest text-black px-3 py-1.5"
                  style={{ background: accent, opacity: live ? 1 : 0.5 }}
                >
                  {live ? `${label} →` : 'Coming soon'}
                </span>
              </>
            );

            const base = 'p-6 bg-[#0a0a0a] border border-white/10 flex flex-col gap-3 transition-colors';

            return href ? (
              <Link key={label} href={href} className={`${base} hover:border-[#39FF14]/40`}>
                {inner}
              </Link>
            ) : (
              <div key={label} className={base}>{inner}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
