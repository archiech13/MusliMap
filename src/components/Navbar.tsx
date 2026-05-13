import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { logOut } from '@/lib/auth/actions';

const linkClass =
  'text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white transition-colors whitespace-nowrap';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let role: 'band' | 'fan' | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    role = (profile?.role as 'band' | 'fan') ?? null;
  }

  const isAdmin = !!user && !!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL;

  return (
    <header
      className="shrink-0 flex items-center justify-between gap-6 px-5 py-3 z-30"
      style={{
        background: '#000',
        borderBottom: '1px solid rgba(57,255,20,0.18)',
        boxShadow: '0 1px 24px rgba(57,255,20,0.06)',
      }}
    >
      {/* Logo */}
      <Link href="/" className="shrink-0">
        <Image
          src="/musli-logo-edited.png"
          alt="Musli Map"
          width={140}
          height={56}
          className="h-10 w-auto object-contain"
          priority
        />
      </Link>

      {/* Nav */}
      <nav className="flex items-center gap-5 overflow-x-auto">
        {/* Map — always visible */}
        <Link href="/" className={linkClass}>
          Map
        </Link>

        {/* Band links */}
        {user && role === 'band' && (
          <>
            <Link href="/dashboard/band" className={linkClass}>
              Dashboard
            </Link>
            <Link href="/dashboard/band/post-gig" className={linkClass}>
              Post a Gig
            </Link>
            <Link href="/dashboard/band/my-gigs" className={linkClass}>
              My Gigs
            </Link>
            <form action={logOut}>
              <button
                type="submit"
                className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors"
              >
                Log Out
              </button>
            </form>
          </>
        )}

        {/* Fan links */}
        {user && role === 'fan' && (
          <>
            <Link href="/dashboard/fan" className={linkClass}>
              Dashboard
            </Link>
            <form action={logOut}>
              <button
                type="submit"
                className="text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white transition-colors"
              >
                Log Out
              </button>
            </form>
          </>
        )}

        {/* Admin link */}
        {isAdmin && (
          <Link href="/admin" className={linkClass}>
            Admin
          </Link>
        )}

        {/* Logged-out links */}
        {!user && (
          <>
            <Link href="/auth/login" className={linkClass}>
              Log In
            </Link>
            <Link
              href="/auth/signup"
              className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-black transition-shadow whitespace-nowrap"
              style={{
                background: '#39FF14',
                boxShadow: '0 0 12px rgba(57,255,20,0.4)',
              }}
            >
              Sign Up
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}
