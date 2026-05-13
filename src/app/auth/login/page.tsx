import Link from 'next/link';
import LogInForm from '@/components/auth/LogInForm';

export default function Login() {
  return (
    <div className="w-full max-w-md">
      {/* Heading */}
      <div className="mb-8 text-center">
        <h1
          className="text-3xl md:text-4xl text-white mb-2"
          style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          Welcome Back
        </h1>
        <p className="text-white/40 text-sm">Log in to your Musli Map account.</p>
      </div>

      {/* Neon divider */}
      <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, #39FF14 50%, transparent)' }} />

      {/* Card */}
      <div className="bg-[#0a0a0a] border border-white/10 p-8">
        <LogInForm />
      </div>

      <p className="text-center text-xs text-white/30 mt-4">
        <Link href="/auth/forgot-password" className="text-white/40 hover:text-white/60 transition-colors">
          Forgot your password?
        </Link>
      </p>

      <p className="text-center text-xs text-white/30 mt-3">
        New here?{' '}
        <Link href="/auth/signup" className="text-[#39FF14] hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
