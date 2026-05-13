import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { approveBand, rejectBand } from '@/lib/admin/actions';
import type { SocialLinks } from '@/types/database';

const headingStyle = {
  fontFamily: 'var(--font-anton)',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
};

export default async function AdminPage() {
  // ── Auth guard ────────────────────────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!adminEmail || !user || user.email !== adminEmail) redirect('/');

  // ── Fetch all band profiles via admin client ──────────────
  const admin = createAdminClient();
  const { data: bands } = await admin
    .from('profiles')
    .select('id, display_name, genres, social_links, based_in, bio, avatar_url, status, created_at')
    .eq('role', 'band')
    .order('created_at', { ascending: false });

  const pending  = (bands ?? []).filter(b => b.status === 'pending');
  const approved = (bands ?? []).filter(b => b.status === 'approved');
  const rejected = (bands ?? []).filter(b => b.status === 'rejected');

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="px-6 py-12 max-w-4xl mx-auto w-full">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-bold uppercase tracking-widest text-[#39FF14] mb-2">
            Admin
          </p>
          <h1 className="text-4xl text-white" style={headingStyle}>
            Band Applications
          </h1>
          <div className="flex gap-6 mt-3">
            <Pill label="Pending"  count={pending.length}  color="#FF6600" />
            <Pill label="Approved" count={approved.length} color="#39FF14" />
            <Pill label="Rejected" count={rejected.length} color="#555" />
          </div>
        </div>

        {/* Pending */}
        <Section title="Pending Applications" accent="#FF6600" empty="No pending applications.">
          {pending.map(band => (
            <BandRow
              key={band.id}
              band={band}
              actions={
                <div className="flex gap-2 mt-4 sm:mt-0 shrink-0">
                  <form action={approveBand.bind(null, band.id)}>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-black transition-opacity hover:opacity-80"
                      style={{ background: '#39FF14' }}
                    >
                      Approve
                    </button>
                  </form>
                  <form action={rejectBand.bind(null, band.id)}>
                    <button
                      type="submit"
                      className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-white/60 border border-white/20 hover:text-white hover:border-white/40 transition-colors"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              }
            />
          ))}
        </Section>

        {/* Approved */}
        <Section title="Approved" accent="#39FF14" empty="No approved bands yet.">
          {approved.map(band => (
            <BandRow
              key={band.id}
              band={band}
              actions={
                <form action={rejectBand.bind(null, band.id)}>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white/30 border border-white/10 hover:text-white/60 hover:border-white/20 transition-colors"
                  >
                    Revoke
                  </button>
                </form>
              }
            />
          ))}
        </Section>

        {/* Rejected */}
        <Section title="Rejected" accent="#555" empty="No rejected bands.">
          {rejected.map(band => (
            <BandRow
              key={band.id}
              band={band}
              actions={
                <form action={approveBand.bind(null, band.id)}>
                  <button
                    type="submit"
                    className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest text-white/30 border border-white/10 hover:text-white/60 hover:border-white/20 transition-colors"
                  >
                    Re-approve
                  </button>
                </form>
              }
            />
          ))}
        </Section>

      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────

function Pill({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <span className="text-xs font-bold uppercase tracking-widest" style={{ color }}>
      {count} {label}
    </span>
  );
}

function Section({
  title,
  accent,
  empty,
  children,
}: {
  title: string;
  accent: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.some(Boolean);

  return (
    <div className="mb-12">
      <h2
        className="text-xs font-bold uppercase tracking-widest mb-4"
        style={{ color: accent }}
      >
        {title}
      </h2>
      {hasItems ? (
        <div className="space-y-3">{children}</div>
      ) : (
        <p className="text-white/25 text-sm">{empty}</p>
      )}
    </div>
  );
}

function BandRow({
  band,
  actions,
}: {
  band: {
    id: string;
    display_name: string;
    genres: string[];
    social_links: SocialLinks;
    based_in: string | null;
    bio: string | null;
    avatar_url: string | null;
    status: string;
    created_at: string;
  };
  actions: React.ReactNode;
}) {
  const social = (band.social_links ?? {}) as SocialLinks;
  const socialEntries = [
    social.instagram && { label: 'Instagram', url: social.instagram },
    social.spotify   && { label: 'Spotify',   url: social.spotify   },
    social.facebook  && { label: 'Facebook',   url: social.facebook  },
    social.website   && { label: 'Website',    url: social.website   },
  ].filter(Boolean) as { label: string; url: string }[];

  const signedUp = new Date(band.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="bg-[#0a0a0a] border border-white/10 p-5 flex flex-col sm:flex-row sm:items-start gap-4">
      {/* Avatar */}
      <div className="shrink-0 w-12 h-12 rounded-full overflow-hidden bg-[#1a1a1a] border border-white/10 flex items-center justify-center">
        {band.avatar_url
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={band.avatar_url} alt={band.display_name} className="w-full h-full object-cover" />
          : <span className="text-lg">🎸</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-1">
          <span
            className="text-white font-bold uppercase tracking-wide"
            style={{ fontFamily: 'var(--font-anton)', letterSpacing: '0.05em' }}
          >
            {band.display_name}
          </span>
          {(band.genres ?? []).map((g: string) => (
            <span key={g} className="text-xs text-white/40">{g}</span>
          ))}
          {band.based_in && (
            <span className="text-xs text-white/30">📍 {band.based_in}</span>
          )}
        </div>

        {band.bio && (
          <p className="text-sm text-white/40 mb-2 line-clamp-2">{band.bio}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className="text-white/25">Signed up {signedUp}</span>
          {socialEntries.map(({ label, url }) => (
            <a
              key={label}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/40 hover:text-white transition-colors underline underline-offset-2"
            >
              {label}
            </a>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div>{actions}</div>
    </div>
  );
}
