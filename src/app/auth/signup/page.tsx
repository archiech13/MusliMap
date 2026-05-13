import Link from 'next/link';

export default function SignUpChoice() {
  return (
    <div className="w-full max-w-2xl">
      <div className="text-center mb-10">
        <h1
          className="text-4xl md:text-5xl text-white mb-3"
          style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          Join Musli Map
        </h1>
        <p className="text-white/40 text-sm tracking-wide">
          Choose your account type to get started
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Band */}
        <Link
          href="/auth/signup/band"
          className="group relative flex flex-col gap-4 p-8 bg-[#0a0a0a] border border-white/10 hover:border-[#39FF14]/60 transition-all duration-200"
          style={{ ':hover': { boxShadow: '0 0 30px rgba(57,255,20,0.08)' } } as React.CSSProperties}
        >
          <div
            className="w-12 h-12 flex items-center justify-center text-2xl border border-white/10 group-hover:border-[#39FF14]/40 transition-colors"
            aria-hidden
          >
            🎸
          </div>
          <div>
            <h2
              className="text-xl text-white mb-2"
              style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              I&apos;m a Band
            </h2>
            <p className="text-sm text-white/40 leading-relaxed">
              Post your upcoming gigs and get discovered by fans near you.
            </p>
          </div>
          <span
            className="mt-auto inline-block text-xs font-bold uppercase tracking-widest text-black px-4 py-2 transition-all"
            style={{ background: '#39FF14' }}
          >
            Sign up as a Band →
          </span>
        </Link>

        {/* Fan */}
        <Link
          href="/auth/signup/fan"
          className="group relative flex flex-col gap-4 p-8 bg-[#0a0a0a] border border-white/10 hover:border-[#FF6600]/60 transition-all duration-200"
        >
          <div
            className="w-12 h-12 flex items-center justify-center text-2xl border border-white/10 group-hover:border-[#FF6600]/40 transition-colors"
            aria-hidden
          >
            🎧
          </div>
          <div>
            <h2
              className="text-xl text-white mb-2"
              style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              I&apos;m a Fan
            </h2>
            <p className="text-sm text-white/40 leading-relaxed">
              Follow your favourite bands and get notified when they play near you.
            </p>
          </div>
          <span
            className="mt-auto inline-block text-xs font-bold uppercase tracking-widest text-black px-4 py-2 transition-all"
            style={{ background: '#FF6600' }}
          >
            Sign up as a Fan →
          </span>
        </Link>
      </div>

      <p className="text-center text-xs text-white/30 mt-8">
        Already have an account?{' '}
        <Link href="/auth/login" className="text-[#39FF14] hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
