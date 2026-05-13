import Link from 'next/link';
import FanSignUpForm from '@/components/auth/FanSignUpForm';

export default function FanSignUp() {
  return (
    <div className="w-full max-w-md">
      {/* Back link */}
      <Link
        href="/auth/signup"
        className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-white/30 hover:text-white/60 transition-colors mb-8"
      >
        ← Back
      </Link>

      {/* Heading */}
      <div className="mb-8">
        <div
          className="inline-block text-xs font-bold uppercase tracking-widest px-2.5 py-1 mb-4 text-black"
          style={{ background: '#FF6600' }}
        >
          Fan Account
        </div>
        <h1
          className="text-3xl md:text-4xl text-white"
          style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          Find Live Music
        </h1>
        <p className="text-white/40 text-sm mt-2">
          Follow bands and never miss a gig near you.
        </p>
      </div>

      {/* Card */}
      <div className="bg-[#0a0a0a] border border-white/10 p-8">
        <FanSignUpForm />
      </div>
    </div>
  );
}
