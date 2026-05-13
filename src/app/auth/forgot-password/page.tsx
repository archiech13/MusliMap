import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md">
      <div className="mb-8 text-center">
        <h1
          className="text-3xl md:text-4xl text-white mb-2"
          style={{ fontFamily: 'var(--font-anton)', textTransform: 'uppercase', letterSpacing: '0.04em' }}
        >
          Reset Password
        </h1>
        <p className="text-white/40 text-sm">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <div className="h-px mb-8" style={{ background: 'linear-gradient(90deg, transparent, #39FF14 50%, transparent)' }} />

      <div className="bg-[#0a0a0a] border border-white/10 p-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
